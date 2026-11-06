/* ===== Business bookings > Payments: pending / received / total booking payment + payout account (UPI & bank) ===== */
const OM = { loaded: false, busy: false, err: '', payouts: [], bank: null, pct: 10 };
async function loadOwnerMoney() {
  try {
    const id = S.account.id;
    const [po, bk, st] = await Promise.all([
      SB.from('owner_payouts').select('*').eq('owner_id', id).order('paid_on', { ascending: false }).order('created_at', { ascending: false }),
      SB.from('owner_bank').select('*').eq('owner_id', id).maybeSingle(),
      SB.from('payout_settings').select('commission_pct').eq('id', 1).maybeSingle()]);
    if (po.error) throw po.error; if (bk.error) throw bk.error;
    OM.payouts = po.data || []; OM.bank = bk.data || null; OM.pct = st.data ? +st.data.commission_pct : 10; OM.err = '';
  } catch (e) { OM.err = /relation|schema cache|does not exist|permission|policy/i.test(e.message || '') ? 'Run the latest supabase/schema.sql in the Supabase SQL Editor to turn on payments.' : (e.message || 'Could not load payments'); }
  OM.loaded = true;
}
function omStats() {
  const s = { total: 0, held: 0, earned: 0, commission: 0, received: 0, pending: 0 };
  S.inbox.forEach(b => {
    const net = ((b.paidPaise || 0) - (b.refPaise || 0)) / 100, settled = b.status === 'Completed' || ((b.status === 'Cancelled' || b.status === 'Declined') && net > 0);
    s.total += Math.max(0, net);
    if (settled) { const c = Math.round((b.status === 'Completed' ? b.total : Math.max(0, net)) * OM.pct) / 100; s.commission += c; s.earned += net - c; }
    else if (b.status === 'Pending' || b.status === 'Upcoming') s.held += Math.max(0, net);
  });
  s.received = OM.payouts.reduce((a, p) => a + (+p.amount_paise || 0) / 100, 0);
  s.pending = Math.max(0, s.earned - s.received);
  return s;
}
const omMask = a => a ? '•••• ' + String(a).slice(-4) : '';
function payPanel() {
  if (!OM.loaded) { if (!OM.busy) { OM.busy = true; loadOwnerMoney().then(() => { OM.busy = false; if (typeof BV !== 'undefined' && BV === 'biz' && BBT === 'Payments') rBookings(1); }); } return '<div class="empty"><p>Loading payments…</p></div>'; }
  if (OM.err) return `<div class="empty"><p>${esc(OM.err)}</p></div>`;
  const s = omStats(), k = OM.bank, has = k && (k.upi || (k.account_no && k.ifsc)), MT = { upi: 'UPI', bank: 'Bank transfer', cash: 'Cash', cheque: 'Cheque', adjustment: 'Adjustment' };
  return `<div class="stg"><div class="stc"><span>Pending payment</span><b>${money(s.pending)}</b></div><div class="stc"><span>Received payment</span><b>${money(s.received)}</b></div><div class="stc"><span>Total booking payment</span><b>${money(s.total)}</b></div><div class="stc"><span>On hold (upcoming)</span><b>${money(s.held)}</b></div></div>
<p class="sub" style="margin:-4px 0 14px">Pending payment is what is due to you from completed bookings after the ${OM.pct}% service fee, minus what you have already received.</p>
<h3 class="hrt">Payout account</h3>
<div class="sum"><div><b>${has ? 'Where we pay you' : 'Not added yet'}</b>${has ? '<span class="tag ok">Added</span>' : '<span class="tag wait">Add one to get paid</span>'}</div>
${k && k.account_name ? `<div><span class="sub">Account holder</span><span>${esc(k.account_name)}</span></div>` : ''}
${k && k.upi ? `<div><span class="sub">UPI ID</span><span>${esc(k.upi)}</span></div>` : ''}
${k && k.account_no ? `<div><span class="sub">Bank</span><span>${esc(k.bank_name || '')} ${omMask(k.account_no)} · ${esc(k.ifsc || '')}</span></div>` : ''}
<div class="row"><button class="btn g sm" onclick="payAcctForm()">${has ? 'Edit' : 'Add'} UPI / bank account</button></div></div>
<h3 class="hrt" style="margin-top:22px">Payments received</h3>
${OM.payouts.length ? OM.payouts.map(p => `<div class="sum"><div><b>${money((+p.amount_paise || 0) / 100)}</b><span class="tag ok">${esc(MT[p.method] || p.method)}</span></div><div><span class="sub">Date</span><span>${esc(p.paid_on)}</span></div>${p.reference ? `<div><span class="sub">Reference</span><span>${esc(p.reference)}</span></div>` : ''}${p.note ? `<div><span class="sub">Note</span><span>${esc(p.note)}</span></div>` : ''}</div>`).join('') : '<div class="empty"><p>No payments received yet. They appear here once the admin pays you.</p></div>'}`;
}
function payAcctForm() {
  const k = OM.bank || {};
  modal('UPI / bank account', `<form id="paf" novalidate><p class="sub" style="margin-bottom:10px">Only you and the admin can see this. Add a UPI ID, a bank account, or both.</p>
${fld('pn', 'Account holder name', k.account_name || '', 'text', 'Name as on the account', 'maxlength="80"')}
<div style="margin-top:10px">${fld('pu', 'UPI ID', k.upi || '', 'text', 'name@bank', 'maxlength="80" autocapitalize="none"')}</div>
<div class="two" style="margin-top:10px">${fld('pb', 'Bank name', k.bank_name || '', 'text', '', 'maxlength="80"')}${fld('pa', 'Account number', k.account_no || '', 'text', '', 'maxlength="18" inputmode="numeric"')}</div>
<div style="margin-top:10px">${fld('pi', 'IFSC code', k.ifsc || '', 'text', 'e.g. SBIN0001234', 'maxlength="11" autocapitalize="characters"')}</div>
<div class="row"><button class="btn g" id="pas">Save account</button><button type="button" class="btn o" onclick="dlg.close()">Cancel</button></div></form>`);
  $('#paf').onsubmit = async e => {
    e.preventDefault(); $$('#paf .err').forEach(x => x.textContent = '');
    const v = id => $('#' + id).value.trim(), E = {}, ifsc = v('pi').toUpperCase(), acc = v('pa').replace(/\s/g, '');
    if (v('pn').length < 2) E.pn = 'Enter the account holder name';
    if (v('pu') && !/^[\w.\-]{2,}@[A-Za-z]{2,}$/.test(v('pu'))) E.pu = 'UPI ID looks wrong (example: name@bank)';
    if (acc || ifsc || v('pb')) {
      if (!/^\d{9,18}$/.test(acc)) E.pa = 'Enter 9 to 18 digits';
      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) E.pi = 'IFSC looks wrong (example: SBIN0001234)';
      if (v('pb').length < 2) E.pb = 'Enter the bank name';
    }
    if (!v('pu') && !acc) { E.pu = 'Add a UPI ID or a bank account'; }
    if (Object.keys(E).length) { for (const x in E) $('#e_' + x).textContent = E[x]; return; }
    const b = $('#pas'); b.disabled = true; b.textContent = 'Saving…';
    const { error } = await SB.from('owner_bank').upsert({ owner_id: S.account.id, account_name: v('pn'), upi: v('pu'), bank_name: v('pb'), account_no: acc, ifsc, updated_at: new Date().toISOString() });
    if (error) { b.disabled = false; b.textContent = 'Save account'; return toast(/relation|policy|permission/i.test(error.message) ? 'Run the latest supabase/schema.sql first' : error.message); }
    OM.loaded = false; dlg.close(); toast('Payout account saved'); rBookings(1);
  };
}
