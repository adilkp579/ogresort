/* Admin dashboard: PRICING section. Tax %, service fee (rupees per booking) and "pay advance" % for stays and activities,
   with an optional override per category (Resort, Villa, Water, ...). Stored in public.pricing_rules.
   The Worker prices every booking from these rules and the site shows the same numbers, so every payment is consistent.
   Uses kpverthyadmin.js globals: A, SB, app, ask, esc, toast, OPT_DEF. */
const PR = { rows: [], loaded: false, err: '' };
const PR_DEF = { stay: { tax_pct: 12, service_fee: 450, advance_pct: 5 }, activity: { tax_pct: 5, service_fee: 0, advance_pct: 5 } };
const PR_KINDS = [['stay', 'Stays', 'resort_type', 'Applies to every resort, villa, homestay... listing. Room price × nights, then tax, then the service fee.'],
  ['activity', 'Activities', 'activity_category', 'Applies to every activity ticket booking. Ticket total, then tax, then the service fee.']];

async function loadPricingRules() {
  PR.err = '';
  const r = await SB.from('pricing_rules').select('*');
  if (r.error) { PR.loaded = false; PR.err = /relation|schema cache|does not exist/i.test(r.error.message || '') ? 'Run the latest supabase/schema.sql in the Supabase SQL Editor first (it creates the pricing table).' : r.error.message; return; }
  PR.rows = r.data; PR.loaded = true;
}
const prKey = s => String(s || '').trim().toLowerCase();
const prOf = (kind, cat) => PR.rows.find(r => r.kind === kind && prKey(r.category) === prKey(cat));
const prCats = (kind, optKind) => {
  const opts = A.opts.filter(o => o.kind === optKind).map(o => o.name), base = opts.length ? opts : OPT_DEF[optKind];
  const seen = new Set(), out = [];
  [...base, ...A.L.filter(l => l.kind === kind).map(l => l.category), ...PR.rows.filter(r => r.kind === kind && r.category).map(r => r.category)].forEach(c => { c = String(c || '').trim(); if (c && !seen.has(prKey(c))) { seen.add(prKey(c)); out.push(c); } });
  return out;
};
const prNum = v => (v === '' || v == null ? NaN : Number(v));
const prInr = n => '₹' + Math.round(n).toLocaleString('en-IN');
function prExample(tax, fee, adv) {
  if (![tax, fee, adv].every(Number.isFinite)) return '—';
  const total = Math.round(10000 + 10000 * (tax / 100) + fee), now = Math.round(total * (adv / 100));
  return `<b>${prInr(total)}</b> total<br><span class="sub">advance ${prInr(now)} · rest ${prInr(total - now)}</span>`;
}
function prRow(kind, cat, label, def) {
  const own = prOf(kind, cat), v = own || def, key = `${kind}|${cat}`;
  return `<tr data-pk="${esc(key)}" class="${own || cat === '' ? '' : 'prdef'}"><td data-l="Category"><b>${esc(label)}</b>${cat === '' ? '<br><span class="sub">used when a category has no rule of its own</span>' : own ? '<br><span class="tag ok">Own rule</span>' : '<br><span class="tag">Uses default</span>'}</td>
<td data-l="Tax %"><input class="pin" type="number" min="0" max="100" step="0.01" data-f="tax" value="${v.tax_pct}"></td>
<td data-l="Service fee ₹"><input class="pin" type="number" min="0" max="100000" step="1" data-f="fee" value="${v.service_fee}"></td>
<td data-l="Advance %"><input class="pin" type="number" min="1" max="100" step="0.5" data-f="adv" value="${v.advance_pct}"></td>
<td data-l="Example ₹10,000" class="prx">${prExample(+v.tax_pct, +v.service_fee, +v.advance_pct)}</td>
<td class="mgo"><button class="btn g sm" data-pr="save">${own || cat === '' ? 'Save' : 'Set rule'}</button>${own && cat !== '' ? ' <button class="btn o sm" data-pr="reset">Use default</button>' : ''}</td></tr>`;
}
function pricingPanel(el) {
  if (!PR.loaded) { el.innerHTML = `<div class="empty"><h3>${PR.err ? 'Could not load' : 'Loading…'}</h3><p>${esc(PR.err || 'Please wait')}</p>${PR.err ? '<button class="btn g sm" data-pr="reload">Try again</button>' : ''}</div>`; return; }
  el.innerHTML = `<p class="sub" style="margin-bottom:12px;max-width:760px">Set the <b>tax</b>, <b>service fee</b> (a fixed ₹ amount added to each booking) and the <b>advance %</b> guests can pay now. Give a category (Resort, Villa, Water...) its own rule, or leave it on the default. The same rule is used on the booking page, at checkout and by the payment server, so every guest is charged the same way. Changes apply to <b>new bookings only</b>; existing bookings keep the rates they were made with. Choosing <b>100%</b> advance means the full amount is paid online.</p>`
    + PR_KINDS.map(([kind, title, optKind, note]) => {
      const def = prOf(kind, '') || PR_DEF[kind];
      return `<div class="sum prbox" style="display:block"><h3 style="margin:0 0 2px">${title}</h3><p class="sub" style="margin:0 0 10px">${note}</p>
<div class="mtw"><table class="mt prt" data-kind="${kind}"><thead><tr><th>Category</th><th>Tax %</th><th>Service fee ₹</th><th>Advance %</th><th>Example ₹10,000</th><th></th></tr></thead><tbody>${prRow(kind, '', `All ${title.toLowerCase()} (default)`, def)}${prCats(kind, optKind).map(c => prRow(kind, c, c, def)).join('')}</tbody></table></div></div>`;
    }).join('');
}
function prRowRead(tr) {
  const f = n => prNum(tr.querySelector(`[data-f="${n}"]`).value);
  return { tax: f('tax'), fee: f('fee'), adv: f('adv') };
}
app.addEventListener('input', e => {
  const tr = e.target.closest('tr[data-pk]'); if (!tr || !e.target.matches('.pin')) return;
  const v = prRowRead(tr); tr.querySelector('.prx').innerHTML = prExample(v.tax, v.fee, v.adv);
});
app.addEventListener('click', async e => {
  const b = e.target.closest('[data-pr]'); if (!b) return;
  const tr = b.closest('tr[data-pk]'), act = b.dataset.pr;
  try {
    if (act === 'reload') { await loadPricingRules(); return panel(); }
    const [kind, cat] = tr.dataset.pk.split('|');
    if (act === 'reset') return ask(`Remove the own rule for ${esc(cat)}? It will use the default again.`, 'Use default', async () => {
      const { error } = await SB.from('pricing_rules').delete().eq('kind', kind).eq('category', prOf(kind, cat).category); if (error) throw error;
      await loadPricingRules(); panel(); toast('Now using the default');
    });
    const v = prRowRead(tr);
    if (!(v.tax >= 0 && v.tax <= 100)) return toast('Tax must be between 0 and 100');
    if (!(v.fee >= 0 && v.fee <= 100000)) return toast('Service fee must be between ₹0 and ₹1,00,000');
    if (!(v.adv > 0 && v.adv <= 100)) return toast('Advance must be above 0 and at most 100');
    b.disabled = true;
    const { error } = await SB.from('pricing_rules').upsert({ kind, category: cat, tax_pct: v.tax, service_fee: v.fee, advance_pct: v.adv, updated_at: new Date().toISOString() }, { onConflict: 'kind,category' });
    if (error) { b.disabled = false; throw error; }
    await loadPricingRules(); panel(); toast(cat ? `Saved rule for ${cat}` : 'Default saved');
  } catch (err) { toast(err.message || 'Could not save'); }
});
