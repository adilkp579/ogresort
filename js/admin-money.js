/* Admin dashboard: BOOKINGS and OWNER PAYMENTS sections.
   Loaded after kpverthyadmin.js. Uses its globals: A, SB, app, dlg, modal, ask, esc, toast, btn, SRCH, CLOUD.

   Money model (all stored in paise, shown in rupees)
   - collected online  = amount_paid_paise - refunded_paise            (what the platform really holds for the booking)
   - commission        = commission_pct % of the booking total         (Completed bookings)
                         or of the retained amount                      (Cancelled / Declined bookings where money was kept)
   - owner earning     = collected online - commission                 (negative = owner owes the platform)
   - held              = collected online on Pending / Upcoming bookings (not payable yet)
   - balance due       = sum of owner earnings (settled bookings) - sum of payouts recorded in the ledger */

const M = {
  loaded: false, err: '', B: [], pay: {}, refunds: {}, payouts: [], bank: {}, pct: 10,
  tab: 'Summary',
  bq: '', bs: 'all', bk: 'all', bo: 'all', bfrom: '', bto: '', bsort: 'new', bpg: 1, today: false,
  oq: '', odue: false, pq: '', po: 'all', pm: 'all', pfrom: '', pto: '', ppg: 1
};
const PAGE = 25;
const rs = p => (Number(p) || 0) / 100;
const inr = n => (n < 0 ? '-' : '') + '₹' + Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const istToday = () => new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);
const fdate = d => { if (!d) return '—'; const x = new Date(String(d).length === 10 ? d + 'T00:00:00' : d); return isNaN(x) ? '—' : x.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); };
const fdt = d => d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';
const BST = { Pending: 'wait', Upcoming: 'ok', Completed: 'ok', Cancelled: 'no', Declined: 'no' };
const METHODS = { upi: 'UPI', bank: 'Bank transfer', cash: 'Cash', cheque: 'Cheque', adjustment: 'Adjustment / recovery' };
const MSTATUS = ['Pending', 'Upcoming', 'Completed', 'Cancelled', 'Declined'];

/* ---------- data ---------- */
async function mPage(make) {
  let out = [], from = 0;
  for (;;) {
    const r = await make().range(from, from + 999);
    if (r.error) throw r.error;
    out = out.concat(r.data);
    if (r.data.length < 1000 || out.length >= 20000) return out;
    from += 1000;
  }
}
async function loadMoney() {
  M.err = '';
  try {
    const [b, pay, ref, po, bank, set] = await Promise.all([
      mPage(() => SB.from('bookings').select('id,ref,listing_id,owner_id,kind,guest_name,guest_email,guest_phone,note,total,details,status,cancelled_by,created_at,amount_paid_paise,refunded_paise,pay_mode').order('created_at', { ascending: false }).order('id')),
      mPage(() => SB.from('payments').select('id,booking_id,rzp_order_id,rzp_payment_id,amount_paise,status,method,paid_at').order('id')).catch(() => []),
      mPage(() => SB.from('refunds').select('id,payment_id,rzp_refund_id,amount_paise,reason,status,created_at').order('id')).catch(() => []),
      mPage(() => SB.from('owner_payouts').select('*').order('paid_on', { ascending: false }).order('created_at', { ascending: false }).order('id')),
      mPage(() => SB.from('owner_bank').select('*').order('owner_id')),
      SB.from('payout_settings').select('commission_pct').eq('id', 1).maybeSingle()]);
    M.B = b; M.payouts = po;
    M.pay = {}; pay.forEach(p => { M.pay[p.booking_id] = p; });
    const byPay = {}; ref.forEach(r => { byPay[r.payment_id] = r; });
    M.refunds = {}; Object.values(M.pay).forEach(p => { if (byPay[p.id]) M.refunds[p.booking_id] = byPay[p.id]; });
    M.bank = {}; bank.forEach(x => { M.bank[x.owner_id] = x; });
    if (set.data) M.pct = Number(set.data.commission_pct);
    M.loaded = true;
  } catch (e) {
    M.loaded = false;
    M.err = /relation|schema cache|does not exist|permission/i.test(e.message || '') ? 'Run the latest supabase/schema.sql in the Supabase SQL Editor first (it adds the payout tables).' : (e.message || 'Could not load bookings');
  }
}

/* ---------- calculations ---------- */
const listingOf = id => A.L.find(l => l.id === id);
const ownerOf = id => A.owners.find(o => o.id === id);
const ownerName = id => { const o = ownerOf(id); return o ? (o.business_name || o.email) : 'Unassigned'; };
const netPaid = b => rs(b.amount_paid_paise) - rs(b.refunded_paise);
const isSettled = b => b.status === 'Completed' || ((b.status === 'Cancelled' || b.status === 'Declined') && netPaid(b) > 0);
const isHeld = b => b.status === 'Pending' || b.status === 'Upcoming';
const commissionOf = b => {
  if (b.status === 'Completed') return Math.round(Number(b.total) * M.pct) / 100;
  if (b.status === 'Cancelled' || b.status === 'Declined') return Math.round(Math.max(0, netPaid(b)) * M.pct) / 100;
  return 0;
};
const earningOf = b => (isSettled(b) ? netPaid(b) - commissionOf(b) : 0);
const startOf = b => (b.details && (b.details.in || b.details.date)) || '';
function ownerStats(id) {
  const bs = M.B.filter(b => b.owner_id === id);
  const s = { n: bs.length, settledN: 0, collected: 0, commission: 0, earned: 0, held: 0, refunded: 0, paidOut: 0 };
  bs.forEach(b => {
    s.refunded += rs(b.refunded_paise);
    if (isSettled(b)) { s.settledN++; s.collected += netPaid(b); s.commission += commissionOf(b); s.earned += earningOf(b); }
    else if (isHeld(b)) s.held += netPaid(b);
  });
  s.paidOut = M.payouts.filter(p => p.owner_id === id).reduce((a, p) => a + rs(p.amount_paise), 0);
  s.due = s.earned - s.paidOut;
  return s;
}
const ownerIds = () => [...new Set([...A.owners.map(o => o.id), ...M.B.map(b => b.owner_id).filter(Boolean), ...M.payouts.map(p => p.owner_id)])];

/* ---------- small helpers ---------- */
function csvDownload(name, rows) {
  const q = v => { v = v == null ? '' : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  const blob = new Blob(['﻿' + rows.map(r => r.map(q).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.append(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
const stat = (label, val, sub = '', cls = '') => `<div class="stc mst ${cls}"><span>${label}</span><b>${val}</b>${sub ? `<small>${sub}</small>` : ''}</div>`;
const pager = (n, pg, key) => { const pages = Math.max(1, Math.ceil(n / PAGE)); return n > PAGE ? `<div class="mpg"><button class="btn o sm" data-m="pg" data-k="${key}" data-v="${pg - 1}" ${pg <= 1 ? 'disabled' : ''}>← Prev</button><span class="sub">Page ${pg} of ${pages} · ${n} results</span><button class="btn o sm" data-m="pg" data-k="${key}" data-v="${pg + 1}" ${pg >= pages ? 'disabled' : ''}>Next →</button></div>` : `<div class="mpg"><span class="sub">${n} result${n === 1 ? '' : 's'}</span></div>`; };
const dateFilters = (a, b, ka, kb) => `<label class="mf">From<input type="date" data-mi="${ka}" value="${a}"></label><label class="mf">To<input type="date" data-mi="${kb}" value="${b}"></label>`;
const ownerSelect = (key, val, all = 'All owners') => `<label class="mf">Owner<select data-mi="${key}"><option value="all">${all}</option>${ownerIds().map(id => `<option value="${id}" ${val === id ? 'selected' : ''}>${esc(ownerName(id))}</option>`).join('')}</select></label>`;
const notReady = el => { el.innerHTML = `<div class="empty"><h3>${M.err ? 'Could not load' : 'Loading…'}</h3><p>${esc(M.err || 'Please wait')}</p>${M.err ? '<button class="btn g sm" data-m="reload">Try again</button>' : ''}</div>`; };

/* =====================================================================
   BOOKINGS
   ===================================================================== */
function bookingsFiltered() {
  const q = M.bq.trim().toLowerCase(), t = istToday();
  let L = M.B.filter(b => {
    if (M.bs !== 'all' && b.status !== M.bs) return false;
    if (M.bk !== 'all' && b.kind !== M.bk) return false;
    if (M.bo !== 'all' && (b.owner_id || 'none') !== M.bo) return false;
    const day = String(b.created_at).slice(0, 10);
    if (M.bfrom && day < M.bfrom) return false;
    if (M.bto && day > M.bto) return false;
    if (M.today && !(startOf(b) === t && (b.status === 'Upcoming' || b.status === 'Pending'))) return false;
    if (q) {
      const l = listingOf(b.listing_id);
      const hay = [b.ref, b.guest_name, b.guest_email, b.guest_phone, l && l.name, ownerName(b.owner_id)].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  const by = { new: (x, y) => y.created_at.localeCompare(x.created_at), old: (x, y) => x.created_at.localeCompare(y.created_at), high: (x, y) => y.total - x.total,
    soon: (x, y) => (startOf(x) || '9').localeCompare(startOf(y) || '9') };
  return L.sort(by[M.bsort] || by.new);
}
function bkWhen(b) {
  const d = b.details || {};
  if (b.kind === 'stay') { const n = d.in && d.out ? Math.round((Date.parse(d.out) - Date.parse(d.in)) / 864e5) : 0; return `${fdate(d.in)} → ${fdate(d.out)}<br><span class="sub">${n} night${n === 1 ? '' : 's'} · ${esc(d.room || '')} · ${d.guests || 1} guest${d.guests === 1 ? '' : 's'}</span>`; }
  const tk = (d.items || []).reduce((a, i) => a + (i.qty || 0), 0);
  return `${fdate(d.date)} · ${esc(d.slot || '')}<br><span class="sub">${tk} ticket${tk === 1 ? '' : 's'}</span>`;
}
function bookingsPanel(el) {
  if (!M.loaded) return notReady(el);
  const B = M.B, c = s => B.filter(b => b.status === s).length, t = istToday();
  const collected = B.reduce((a, b) => a + netPaid(b), 0), refunded = B.reduce((a, b) => a + rs(b.refunded_paise), 0);
  const atProp = B.filter(isHeld).reduce((a, b) => a + Math.max(0, Number(b.total) - netPaid(b)), 0);
  const todayN = B.filter(b => startOf(b) === t && isHeld(b)).length;
  const L = bookingsFiltered(), pages = Math.max(1, Math.ceil(L.length / PAGE)); if (M.bpg > pages) M.bpg = pages;
  const rows = L.slice((M.bpg - 1) * PAGE, M.bpg * PAGE);
  const owners = ownerIds();
  el.innerHTML = `<div class="mbar"><p class="sub">Every booking on the site, with payment, refund and owner details. Open a booking to see all of it and to act on it.</p><div class="row"><button class="btn o sm" data-m="reload">↻ Refresh</button><button class="btn g sm" data-m="bk-csv">⬇ Export CSV (${L.length})</button></div></div>
<div class="stg mstg">${stat('Total bookings', B.length)}${stat('Needs action', c('Pending'), 'waiting for owner', c('Pending') ? 'warn' : '')}${stat('Upcoming', c('Upcoming'))}${stat('Completed', c('Completed'))}${stat('Cancelled / declined', c('Cancelled') + c('Declined'))}${stat('Collected online', inr(collected), 'after refunds')}${stat('Refunded', inr(refunded))}${stat('To pay at property', inr(atProp), 'on open bookings')}</div>
<form class="hsr" onsubmit="return false">${SRCH}<input data-mi="bq" placeholder="Search booking ref, guest name, email, phone, listing or owner" value="${esc(M.bq)}" autocomplete="off"></form>
<div class="hch" style="margin:12px 0">${[['all', 'All'], ...MSTATUS.map(s => [s, s])].map(([v, l]) => `<button type="button" data-m="bs" data-v="${v}" class="${M.bs === v ? 'on' : ''}">${l}${v === 'all' ? '' : ` (${c(v)})`}</button>`).join('')}<button type="button" data-m="today" class="${M.today ? 'on' : ''}">Today's check-ins / activities (${todayN})</button></div>
<div class="mfl"><label class="mf">Type<select data-mi="bk"><option value="all">All</option><option value="stay" ${M.bk === 'stay' ? 'selected' : ''}>Stays</option><option value="activity" ${M.bk === 'activity' ? 'selected' : ''}>Activities</option></select></label>
<label class="mf">Owner<select data-mi="bo"><option value="all">All owners</option>${owners.map(id => `<option value="${id}" ${M.bo === id ? 'selected' : ''}>${esc(ownerName(id))}</option>`).join('')}</select></label>
${dateFilters(M.bfrom, M.bto, 'bfrom', 'bto')}
<label class="mf">Sort<select data-mi="bsort">${[['new', 'Newest first'], ['old', 'Oldest first'], ['high', 'Highest amount'], ['soon', 'Check-in / date soonest']].map(([v, l]) => `<option value="${v}" ${M.bsort === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
<button class="btn o sm" data-m="breset">Reset filters</button></div>
${rows.length ? `<div class="mtw"><table class="mt"><thead><tr><th>Booking</th><th>Guest</th><th>Listing / owner</th><th>Dates</th><th>Amount</th><th>Status</th><th></th></tr></thead><tbody>${rows.map(bRow).join('')}</tbody></table></div>${pager(L.length, M.bpg, 'bpg')}` : '<div class="empty"><h3>No bookings found</h3><p>Try clearing the filters or search.</p></div>'}`;
}
function bRow(b) {
  const l = listingOf(b.listing_id), net = netPaid(b), due = Math.max(0, Number(b.total) - net);
  return `<tr data-m="bview" data-id="${b.id}" tabindex="0"><td data-l="Booking"><b class="mref">${esc(b.ref)}</b><br><span class="sub">${fdt(b.created_at)}</span></td>
<td data-l="Guest"><b>${esc(b.guest_name)}</b><br><span class="sub">${esc(b.guest_phone || b.guest_email)}</span></td>
<td data-l="Listing"><span class="tag">${b.kind === 'stay' ? 'Stay' : 'Activity'}</span> ${esc(l ? l.name : 'Deleted listing')}<br><span class="sub">${esc(ownerName(b.owner_id))}</span></td>
<td data-l="Dates">${bkWhen(b)}</td>
<td data-l="Amount"><b>${inr(Number(b.total))}</b><br><span class="sub">Paid ${inr(net)}${rs(b.refunded_paise) ? ` · refunded ${inr(rs(b.refunded_paise))}` : ''}${isHeld(b) && due > 0 ? ` · ${inr(due)} at property` : ''}</span></td>
<td data-l="Status"><span class="tag ${BST[b.status] || ''}">${b.status}</span>${b.cancelled_by ? `<br><span class="sub">by ${b.cancelled_by}</span>` : ''}</td>
<td class="mgo"><button class="btn o sm" data-m="bview" data-id="${b.id}">Open</button></td></tr>`;
}
function bookingModal(id) {
  const b = M.B.find(x => x.id === id); if (!b) return;
  const l = listingOf(b.listing_id), o = ownerOf(b.owner_id), p = M.pay[b.id], rf = M.refunds[b.id], d = b.details || {};
  const net = netPaid(b), due = Math.max(0, Number(b.total) - net), ph = String(b.guest_phone || '').replace(/[^\d+]/g, '');
  const kv = (k, v) => `<div><dt>${k}</dt><dd>${v}</dd></div>`;
  const items = (d.items || []).map(i => `${esc(i.name)} × ${i.qty} @ ${inr(i.price)}`).join('<br>');
  const acts = { Pending: [['confirm', 'Confirm booking', 'g'], ['decline', 'Decline + full refund', 'd']], Upcoming: [['complete', 'Mark completed', 'g'], ['cancel', 'Cancel + full refund', 'd']] }[b.status] || [];
  modal(`Booking ${esc(b.ref)}`, `<div class="mdt"><div class="mhd"><span class="tag ${BST[b.status] || ''}">${b.status}</span><span class="tag">${b.kind === 'stay' ? 'Stay' : 'Activity'}</span>${b.cancelled_by ? `<span class="tag">cancelled by ${b.cancelled_by}</span>` : ''}<span class="sub">Booked ${fdt(b.created_at)}</span></div>
<h4>Guest</h4><dl class="mkv">${kv('Name', esc(b.guest_name))}${b.guest_email ? kv('Email', `<a href="mailto:${esc(b.guest_email)}">${esc(b.guest_email)}</a>`) : ''}${(b.details || {}).whatsapp ? kv('WhatsApp', `<a href="https://wa.me/${esc((d => d.length === 10 ? '91' + d : d)(String(b.details.whatsapp).replace(/\D/g, '')))}" target="_blank" rel="noopener">${esc(b.details.whatsapp)}</a>`) : ''}${kv('Phone', b.guest_phone ? `<a href="tel:${esc(ph)}">${esc(b.guest_phone)}</a> · <a href="https://wa.me/${esc(ph.replace(/^\+/, ''))}" target="_blank" rel="noopener">WhatsApp</a>` : '—')}${b.note ? kv('Guest note', esc(b.note)) : ''}</dl>
<h4>${b.kind === 'stay' ? 'Stay' : 'Activity'}</h4><dl class="mkv">${kv('Listing', esc(l ? l.name : 'Deleted listing') + (l ? ` <span class="sub">· ${placeTxt(l)}</span>` : ''))}
${b.kind === 'stay' ? kv('Check-in', fdate(d.in) + ' (from 2:00 PM)') + kv('Check-out', fdate(d.out)) + kv('Room', esc(d.room || '—')) + kv('Guests', d.guests || '—') : kv('Date', fdate(d.date)) + kv('Time slot', esc(d.slot || '—')) + kv('Tickets', items || '—')}</dl>
<h4>Owner</h4><dl class="mkv">${kv('Business', esc(o ? (o.business_name || '—') : 'Unassigned'))}${o ? kv('Contact', `${esc(o.email)} · ${esc(o.phone || '')}`) : ''}</dl>
<h4>Payment</h4><dl class="mkv">${kv('Booking total', `<b>${inr(Number(b.total))}</b> <span class="sub">(incl. taxes and fees)</span>`)}${kv('Payment option', b.pay_mode === 'full' ? 'Full payment online' : b.pay_mode === 'advance' ? 'Advance online, balance at property' : '—')}${kv('Paid online', inr(rs(b.amount_paid_paise)))}${kv('Refunded', inr(rs(b.refunded_paise)))}${kv('Net held', `<b>${inr(net)}</b>`)}${isHeld(b) ? kv('Guest pays at property', `<b>${inr(due)}</b>`) : ''}
${p ? kv('Razorpay method', esc(p.method || '—')) + kv('Razorpay payment ID', `<code>${esc(p.rzp_payment_id || '—')}</code>`) + kv('Razorpay order ID', `<code>${esc(p.rzp_order_id)}</code>`) + kv('Paid at', fdt(p.paid_at)) : kv('Razorpay', 'No online payment recorded')}
${rf ? kv('Refund', `${inr(rs(rf.amount_paise))} · <span class="tag ${rf.status === 'processed' ? 'ok' : rf.status === 'failed' ? 'no' : 'wait'}">${rf.status}</span> <span class="sub">${esc(rf.reason)}</span>`) + (rf.rzp_refund_id ? kv('Refund ID', `<code>${esc(rf.rzp_refund_id)}</code>`) : '') : ''}</dl>
${isSettled(b) || isHeld(b) ? `<h4>Commission split <span class="sub">(${M.pct}%)</span></h4><dl class="mkv">${isSettled(b) ? kv('Platform commission', inr(commissionOf(b))) + kv('Owner earning', `<b>${inr(earningOf(b))}</b>`) : kv('Expected commission', inr(Math.round(Number(b.total) * M.pct) / 100)) + kv('Status', 'Becomes payable once the booking is completed')}</dl>` : ''}
${acts.length ? `<div class="row mact">${acts.map(([a, lab, c]) => `<button class="btn ${c} sm" data-m="bact" data-id="${b.id}" data-act="${a}">${lab}</button>`).join('')}</div><p class="sub">Declines and cancellations refund the guest in full through Razorpay and release the dates.</p>` : ''}</div>`);
}
async function bookingAct(id, act) {
  const b = M.B.find(x => x.id === id); if (!b) return;
  const lab = { confirm: 'Confirm this booking?', decline: `Decline this booking? ${inr(netPaid(b))} will be refunded to the guest.`, cancel: `Cancel this booking? ${inr(netPaid(b))} will be refunded to the guest and the dates are released.`, complete: 'Mark this booking as completed? The owner earning becomes payable.' }[act];
  ask(lab, { confirm: 'Confirm', decline: 'Decline', cancel: 'Cancel booking', complete: 'Mark completed' }[act], async () => {
    const { data } = await SB.auth.getSession(); const token = data.session && data.session.access_token;
    if (!token) throw new Error('Please log in again');
    const r = await CLOUD.request('/v1/bookings/admin-action', { body: { ref: b.ref, action: act }, token });
    await loadMoney(); panel(); render();
    toast(r.refund ? `Done. Refund of ${inr(r.refund)} ${r.refund_state === 'initiated' ? 'started' : 'queued'}.` : 'Booking updated');
  });
}
function bookingsCsv() {
  const L = bookingsFiltered();
  csvDownload(`verdane-bookings-${istToday()}.csv`, [['Ref', 'Booked at', 'Status', 'Type', 'Listing', 'Owner', 'Guest', 'Email', 'Phone', 'WhatsApp', 'Check-in / date', 'Check-out', 'Room / slot', 'Guests / tickets', 'Total', 'Pay option', 'Paid online', 'Refunded', 'Net held', 'At property', 'Commission', 'Owner earning'],
    ...L.map(b => { const d = b.details || {}, l = listingOf(b.listing_id), n = netPaid(b);
      return [b.ref, b.created_at, b.status, b.kind, l ? l.name : '', ownerName(b.owner_id), b.guest_name, b.guest_email, b.guest_phone, d.whatsapp || '', d.in || d.date || '', d.out || '', d.room || d.slot || '', b.kind === 'stay' ? d.guests : (d.items || []).reduce((a, i) => a + i.qty, 0), b.total, b.pay_mode || '', rs(b.amount_paid_paise), rs(b.refunded_paise), n, isHeld(b) ? Math.max(0, b.total - n) : 0, isSettled(b) ? commissionOf(b) : '', isSettled(b) ? earningOf(b) : '']; })]);
}

/* =====================================================================
   OWNER PAYMENTS
   ===================================================================== */
function paymentsPanel(el) {
  if (!M.loaded) return notReady(el);
  const tabs = ['Summary', 'Payouts', 'Owner accounts'];
  el.innerHTML = `<div class="mbar"><p class="sub">What each owner has earned, what the platform keeps as commission, what has been paid out, and what is still due.</p><div class="row"><button class="btn o sm" data-m="reload">↻ Refresh</button></div></div>
<div class="hch mtabs">${tabs.map(t => `<button type="button" data-m="ptab" data-v="${t}" class="${M.tab === t ? 'on' : ''}">${t}</button>`).join('')}</div><div id="mp"></div>`;
  const mp = $('#mp');
  if (M.tab === 'Summary') paySummary(mp); else if (M.tab === 'Payouts') payLedger(mp); else payAccounts(mp);
}
function paySummary(el) {
  const ids = ownerIds(), S = ids.map(id => ({ id, ...ownerStats(id) }));
  const q = M.oq.trim().toLowerCase();
  const L = S.filter(s => (!q || (ownerName(s.id) + ' ' + ((ownerOf(s.id) || {}).email || '')).toLowerCase().includes(q)) && (!M.odue || Math.abs(s.due) >= 0.5)).sort((a, b) => b.due - a.due);
  const T = S.reduce((a, s) => ({ coll: a.coll + s.collected, com: a.com + s.commission, held: a.held + s.held, paid: a.paid + s.paidOut, due: a.due + s.due }), { coll: 0, com: 0, held: 0, paid: 0, due: 0 });
  el.innerHTML = `<div class="mcm"><label class="mf">Platform commission %<input type="number" id="pct" min="0" max="100" step="0.5" value="${M.pct}"></label><button class="btn g sm" data-m="pct-save">Save</button><span class="sub">Applies to the booking total of every completed booking (and to the money kept on cancelled ones). Changing it recalculates all figures below.</span></div>
<div class="stg mstg">${stat('Settled revenue', inr(T.coll), 'completed bookings, net')}${stat('Commission earned', inr(T.com))}${stat('Paid to owners', inr(T.paid))}${stat('Owed to owners', inr(T.due), 'balance due now', T.due > 0 ? 'warn' : '')}${stat('Held for upcoming', inr(T.held), 'not payable yet')}</div>
<div class="mfl"><form class="hsr" onsubmit="return false" style="flex:1 1 240px">${SRCH}<input data-mi="oq" placeholder="Search owner" value="${esc(M.oq)}" autocomplete="off"></form><button type="button" class="hchb ${M.odue ? 'on' : ''}" data-m="odue">Only owners with a balance</button><button class="btn g sm" data-m="sum-csv">⬇ Export CSV</button></div>
${L.length ? `<div class="mtw"><table class="mt"><thead><tr><th>Owner</th><th>Bookings</th><th>Settled revenue</th><th>Commission</th><th>Owner earning</th><th>Paid out</th><th>Balance due</th><th>Held</th><th></th></tr></thead><tbody>${L.map(s => `<tr><td data-l="Owner"><b>${esc(ownerName(s.id))}</b><br><span class="sub">${esc((ownerOf(s.id) || {}).email || '')}</span>${bankOk(s.id) ? '' : '<br><span class="tag wait">No payout account</span>'}</td><td data-l="Bookings">${s.n} <span class="sub">(${s.settledN} settled)</span></td><td data-l="Settled revenue">${inr(s.collected)}</td><td data-l="Commission">${inr(s.commission)}</td><td data-l="Owner earning">${inr(s.earned)}</td><td data-l="Paid out">${inr(s.paidOut)}</td><td data-l="Balance due"><b class="${s.due > 0.5 ? 'mdue' : s.due < -0.5 ? 'mneg' : ''}">${inr(s.due)}</b></td><td data-l="Held">${inr(s.held)}</td><td class="mgo"><button class="btn g sm" data-m="pay" data-id="${s.id}">Pay</button> <button class="btn o sm" data-m="stmt" data-id="${s.id}">Statement</button></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty"><h3>No owners to show</h3><p>Owners appear here as soon as they have bookings or payouts.</p></div>'}`;
}
const bankOk = id => { const k = M.bank[id]; return !!(k && (k.upi || (k.account_no && k.ifsc))); };
function payLedger(el) {
  const q = M.pq.trim().toLowerCase();
  const L = M.payouts.filter(p => (M.po === 'all' || p.owner_id === M.po) && (M.pm === 'all' || p.method === M.pm) && (!M.pfrom || p.paid_on >= M.pfrom) && (!M.pto || p.paid_on <= M.pto) &&
    (!q || (ownerName(p.owner_id) + ' ' + p.reference + ' ' + p.note).toLowerCase().includes(q)));
  const pages = Math.max(1, Math.ceil(L.length / PAGE)); if (M.ppg > pages) M.ppg = pages;
  const tot = L.reduce((a, p) => a + rs(p.amount_paise), 0);
  el.innerHTML = `<div class="stg mstg">${stat('Payouts shown', L.length)}${stat('Total paid', inr(tot))}</div>
<div class="mfl"><form class="hsr" onsubmit="return false" style="flex:1 1 220px">${SRCH}<input data-mi="pq" placeholder="Search owner, reference or note" value="${esc(M.pq)}" autocomplete="off"></form>${ownerSelect('po', M.po)}
<label class="mf">Method<select data-mi="pm"><option value="all">All</option>${Object.entries(METHODS).map(([k, v]) => `<option value="${k}" ${M.pm === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>${dateFilters(M.pfrom, M.pto, 'pfrom', 'pto')}
<button class="btn g sm" data-m="led-csv">⬇ Export CSV</button></div>
${L.length ? `<div class="mtw"><table class="mt"><thead><tr><th>Date</th><th>Owner</th><th>Amount</th><th>Method</th><th>Reference / UTR</th><th>Note</th><th></th></tr></thead><tbody>${L.slice((M.ppg - 1) * PAGE, M.ppg * PAGE).map(p => `<tr><td data-l="Date">${fdate(p.paid_on)}</td><td data-l="Owner"><b>${esc(ownerName(p.owner_id))}</b></td><td data-l="Amount"><b class="${rs(p.amount_paise) < 0 ? 'mneg' : ''}">${inr(rs(p.amount_paise))}</b></td><td data-l="Method">${METHODS[p.method] || p.method}</td><td data-l="Reference">${esc(p.reference || '—')}</td><td data-l="Note">${esc(p.note || '—')}</td><td class="mgo"><button class="btn d sm" data-m="pdel" data-id="${p.id}">Delete</button></td></tr>`).join('')}</tbody></table></div>${pager(L.length, M.ppg, 'ppg')}` : '<div class="empty"><h3>No payouts recorded</h3><p>Use Pay on the Summary tab after you transfer money to an owner.</p></div>'}`;
}
function payAccounts(el) {
  const ids = ownerIds();
  el.innerHTML = `<p class="sub" style="margin-bottom:12px">Where each owner should be paid. Only admins can see this. Add it before you pay an owner.</p>${ids.length ? `<div class="mtw"><table class="mt"><thead><tr><th>Owner</th><th>UPI</th><th>Bank</th><th>Status</th><th></th></tr></thead><tbody>${ids.map(id => { const k = M.bank[id] || {}; return `<tr><td data-l="Owner"><b>${esc(ownerName(id))}</b><br><span class="sub">${esc((ownerOf(id) || {}).phone || '')}</span></td><td data-l="UPI">${esc(k.upi || '—')}</td><td data-l="Bank">${k.account_no ? `${esc(k.account_name || '')}<br><span class="sub">${esc(k.bank_name || '')} · ${esc(k.account_no.replace(/.(?=.{4})/g, '•'))} · ${esc(k.ifsc || '')}</span>` : '—'}</td><td data-l="Status">${bankOk(id) ? '<span class="tag ok">Ready</span>' : '<span class="tag wait">Missing</span>'}</td><td class="mgo"><button class="btn o sm" data-m="bank" data-id="${id}">${bankOk(id) ? 'Edit' : 'Add'}</button></td></tr>`; }).join('')}</tbody></table></div>` : '<div class="empty"><p>No owners yet.</p></div>'}`;
}
function bankForm(id) {
  const k = M.bank[id] || {};
  modal(`Payout account · ${esc(ownerName(id))}`, `<form id="bkf" novalidate><div class="two"><label>Account holder name<input id="bn" maxlength="80" value="${esc(k.account_name || '')}"></label><label>UPI ID<input id="bu" maxlength="80" placeholder="name@bank" value="${esc(k.upi || '')}"></label></div>
<div class="two" style="margin-top:10px"><label>Bank name<input id="bb" maxlength="80" value="${esc(k.bank_name || '')}"></label><label>Account number<input id="ba" inputmode="numeric" maxlength="24" value="${esc(k.account_no || '')}"></label></div>
<div class="two" style="margin-top:10px"><label>IFSC<input id="bi" maxlength="11" style="text-transform:uppercase" value="${esc(k.ifsc || '')}"></label><label>Notes<input id="bt" maxlength="200" value="${esc(k.notes || '')}"></label></div>
<div class="err" id="be"></div><div class="row"><button class="btn g" id="bgo">Save</button></div></form>`);
  $('#bkf').onsubmit = async e => {
    e.preventDefault(); const v = i => $(i).value.trim(), E = $('#be'); E.textContent = '';
    if (v('#bu') && !/^[\w.\-]{2,}@[A-Za-z]{2,}$/.test(v('#bu'))) return E.textContent = 'UPI ID looks wrong (example: name@bank)';
    if (v('#bi') && !/^[A-Za-z]{4}0[A-Za-z0-9]{6}$/.test(v('#bi'))) return E.textContent = 'IFSC must be 11 characters, like SBIN0001234';
    if (v('#ba') && !/^\d{6,24}$/.test(v('#ba'))) return E.textContent = 'Account number must be digits only';
    $('#bgo').disabled = true;
    const { error } = await SB.from('owner_bank').upsert({ owner_id: id, account_name: v('#bn'), upi: v('#bu'), bank_name: v('#bb'), account_no: v('#ba'), ifsc: v('#bi').toUpperCase(), notes: v('#bt'), updated_at: new Date().toISOString() }, { onConflict: 'owner_id' });
    if (error) { $('#bgo').disabled = false; return E.textContent = error.message; }
    await loadMoney(); dlg.close(); panel(); toast('Payout account saved');
  };
}
function payForm(id) {
  const s = ownerStats(id), k = M.bank[id] || {}, due = Math.max(0, s.due);
  const copy = (t, l) => t ? `<button type="button" class="mcopy" data-m="copy" data-v="${esc(t)}" title="Copy">${l}: <b>${esc(t)}</b> ⧉</button>` : '';
  modal(`Pay owner · ${esc(ownerName(id))}`, `<div class="mpay"><div class="stg mstg"><div class="stc mst"><span>Balance due</span><b>${inr(s.due)}</b></div><div class="stc mst"><span>Already paid</span><b>${inr(s.paidOut)}</b></div></div>
<div class="mcp">${bankOk(id) ? `${copy(k.upi, 'UPI')}${copy(k.account_name, 'Name')}${copy(k.account_no, 'A/C')}${copy(k.ifsc, 'IFSC')}${k.bank_name ? `<span class="sub">${esc(k.bank_name)}</span>` : ''}` : `<span class="tag wait">No payout account saved</span> <button type="button" class="btn o sm" data-m="bank" data-id="${id}">Add account</button>`}</div>
<p class="sub">Send the money from your bank / UPI app first, then record it here so the balance stays correct.</p>
<form id="pf" novalidate><div class="two"><label>Amount (₹)<input id="pa" type="number" step="0.01" value="${due ? due.toFixed(2) : ''}" inputmode="decimal"></label><label>Date paid<input id="pd" type="date" value="${istToday()}" max="${istToday()}"></label></div>
<div class="two" style="margin-top:10px"><label>Method<select id="pmth">${Object.entries(METHODS).map(([k2, v]) => `<option value="${k2}" ${k2 === (k.upi ? 'upi' : 'bank') ? 'selected' : ''}>${v}</option>`).join('')}</select></label><label>Reference / UTR<input id="pr" maxlength="80" placeholder="Transaction ID"></label></div>
<label style="margin-top:10px">Note (optional)<input id="pn2" maxlength="300" placeholder="e.g. Settlement for October"></label>
<p class="sub" style="margin-top:6px">Use a negative amount with method “Adjustment / recovery” if an owner repays money or you need to correct the ledger (a note is required).</p>
<div class="err" id="pe"></div><div class="row"><button class="btn g" id="pgo">Record payout</button><button type="button" class="btn o" onclick="dlg.close()">Cancel</button></div></form></div>`);
  $('#pf').onsubmit = e => {
    e.preventDefault(); const E = $('#pe'); E.textContent = '';
    const amt = Math.round(parseFloat($('#pa').value) * 100), method = $('#pmth').value, ref = $('#pr').value.trim(), note = $('#pn2').value.trim(), day = $('#pd').value;
    if (!Number.isFinite(amt) || amt === 0) return E.textContent = 'Enter an amount';
    if (amt < 0 && (method !== 'adjustment' || !note)) return E.textContent = 'A negative amount needs the method “Adjustment / recovery” and a note';
    if (amt > 0 && method === 'adjustment') return E.textContent = 'Adjustments must be negative. For a normal payment choose UPI, bank, cash or cheque';
    if (!day) return E.textContent = 'Choose the date';
    if (['upi', 'bank'].includes(method) && !ref) return E.textContent = 'Enter the transaction reference / UTR';
    const save = async () => {
      $('#pgo').disabled = true;
      const { error } = await SB.from('owner_payouts').insert({ owner_id: id, amount_paise: amt, method, reference: ref, note, paid_on: day });
      if (error) { $('#pgo').disabled = false; return E.textContent = error.message; }
      await loadMoney(); dlg.close(); panel(); toast('Payout recorded');
    };
    if (amt > Math.round(due * 100) + 50) return ask(`${inr(amt / 100)} is more than the balance due (${inr(due)}). Record it anyway? The owner balance will go negative.`, 'Record anyway', save);
    save();
  };
}
function statement(id) {
  const S = ownerStats(id), bs = M.B.filter(b => b.owner_id === id && (isSettled(b) || isHeld(b))).sort((a, b) => b.created_at.localeCompare(a.created_at)), ps = M.payouts.filter(p => p.owner_id === id);
  modal(`Statement · ${esc(ownerName(id))}`, `<div class="stg mstg">${stat('Owner earning', inr(S.earned))}${stat('Paid out', inr(S.paidOut))}${stat('Balance due', inr(S.due), '', S.due > 0 ? 'warn' : '')}${stat('Held', inr(S.held), 'upcoming')}</div>
<div class="row" style="margin:0 0 10px"><button class="btn g sm" data-m="stmt-csv" data-id="${id}">⬇ CSV</button><button class="btn o sm" data-m="stmt-print" data-id="${id}">Print</button>${S.due > 0 ? `<button class="btn g sm" data-m="pay" data-id="${id}">Pay ${inr(S.due)}</button>` : ''}</div>
<h4>Bookings</h4><div class="mtw"><table class="mt mts"><thead><tr><th>Ref</th><th>Status</th><th>Total</th><th>Collected</th><th>Commission</th><th>Earning</th></tr></thead><tbody>${bs.map(b => `<tr><td data-l="Ref">${esc(b.ref)}<br><span class="sub">${esc(startOf(b))}</span></td><td data-l="Status"><span class="tag ${BST[b.status]}">${b.status}</span></td><td data-l="Total">${inr(Number(b.total))}</td><td data-l="Collected">${inr(netPaid(b))}</td><td data-l="Commission">${isSettled(b) ? inr(commissionOf(b)) : '—'}</td><td data-l="Earning">${isSettled(b) ? inr(earningOf(b)) : '<span class="sub">held</span>'}</td></tr>`).join('') || '<tr><td colspan="6" class="sub">No bookings</td></tr>'}</tbody></table></div>
<h4>Payouts</h4><div class="mtw"><table class="mt mts"><thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Reference</th></tr></thead><tbody>${ps.map(p => `<tr><td data-l="Date">${fdate(p.paid_on)}</td><td data-l="Amount">${inr(rs(p.amount_paise))}</td><td data-l="Method">${METHODS[p.method]}</td><td data-l="Reference">${esc(p.reference || '—')}</td></tr>`).join('') || '<tr><td colspan="4" class="sub">No payouts yet</td></tr>'}</tbody></table></div>`);
}
function stmtCsv(id) {
  const bs = M.B.filter(b => b.owner_id === id && (isSettled(b) || isHeld(b)));
  csvDownload(`statement-${ownerName(id).replace(/\W+/g, '-')}-${istToday()}.csv`, [['Type', 'Date', 'Ref / reference', 'Status / method', 'Total', 'Collected', 'Commission', 'Owner earning', 'Payout'],
    ...bs.map(b => ['Booking', startOf(b), b.ref, b.status, b.total, netPaid(b), isSettled(b) ? commissionOf(b) : '', isSettled(b) ? earningOf(b) : '', '']),
    ...M.payouts.filter(p => p.owner_id === id).map(p => ['Payout', p.paid_on, p.reference, METHODS[p.method], '', '', '', '', rs(p.amount_paise)])]);
}
function stmtPrint(id) {
  const S = ownerStats(id), bs = M.B.filter(b => b.owner_id === id && isSettled(b)), w = window.open('', '_blank'); if (!w) return toast('Allow pop-ups to print');
  w.document.write(`<title>Statement</title><body style="font:14px system-ui;padding:24px"><h2>Verdane · Owner statement</h2><p><b>${esc(ownerName(id))}</b> · ${fdate(istToday())}</p><p>Earning ${inr(S.earned)} · Paid ${inr(S.paidOut)} · <b>Balance due ${inr(S.due)}</b></p><table border="1" cellpadding="6" style="border-collapse:collapse;width:100%"><tr><th>Ref</th><th>Status</th><th>Total</th><th>Collected</th><th>Commission</th><th>Earning</th></tr>${bs.map(b => `<tr><td>${esc(b.ref)}</td><td>${b.status}</td><td>${inr(Number(b.total))}</td><td>${inr(netPaid(b))}</td><td>${inr(commissionOf(b))}</td><td>${inr(earningOf(b))}</td></tr>`).join('')}</table><h3>Payouts</h3><table border="1" cellpadding="6" style="border-collapse:collapse;width:100%"><tr><th>Date</th><th>Amount</th><th>Method</th><th>Reference</th></tr>${M.payouts.filter(p => p.owner_id === id).map(p => `<tr><td>${fdate(p.paid_on)}</td><td>${inr(rs(p.amount_paise))}</td><td>${METHODS[p.method]}</td><td>${esc(p.reference)}</td></tr>`).join('')}</table></body>`);
  w.document.close(); w.focus(); w.print();
}

/* ---------- events ---------- */
const refreshMoney = () => { if (A.tab === 'Bookings' || A.tab === 'Owner payments') panel(); };
function moneyInput(e) {
  const k = e.target.dataset && e.target.dataset.mi; if (!k) return;
  M[k] = e.target.value;
  if (k === 'bq' || k === 'oq' || k === 'pq') { M.bpg = 1; M.ppg = 1; const pos = e.target.selectionStart; refreshMoney(); const n = $(`[data-mi="${k}"]`); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (_) {} } return; }
  M.bpg = 1; M.ppg = 1; refreshMoney();
}
app.addEventListener('input', moneyInput); app.addEventListener('change', e => { if (e.target.tagName !== 'INPUT' || e.target.type === 'date') moneyInput(e); });

async function moneyClick(e) {
  const t = e.target.closest('[data-m]'); if (!t) return;
  if (t.tagName === 'TR' && e.target.closest('button')) return;
  const m = t.dataset.m, id = t.dataset.id, v = t.dataset.v;
  try {
    switch (m) {
      case 'reload': M.loaded = false; refreshMoney(); await loadMoney(); render(); return toast(M.err || 'Refreshed');
      case 'bs': M.bs = v; M.bpg = 1; return refreshMoney();
      case 'today': M.today = !M.today; M.bpg = 1; return refreshMoney();
      case 'breset': Object.assign(M, { bq: '', bs: 'all', bk: 'all', bo: 'all', bfrom: '', bto: '', bsort: 'new', bpg: 1, today: false }); return refreshMoney();
      case 'pg': M[t.dataset.k] = Math.max(1, +v); return refreshMoney();
      case 'bview': return bookingModal(id);
      case 'bact': return bookingAct(id, t.dataset.act);
      case 'bk-csv': return bookingsCsv();
      case 'ptab': M.tab = v; return refreshMoney();
      case 'odue': M.odue = !M.odue; return refreshMoney();
      case 'pay': return payForm(id);
      case 'stmt': return statement(id);
      case 'stmt-csv': return stmtCsv(id);
      case 'stmt-print': return stmtPrint(id);
      case 'bank': return bankForm(id);
      case 'copy': try { await navigator.clipboard.writeText(v); toast('Copied'); } catch (_) { toast('Copy not allowed here'); } return;
      case 'pdel': return ask('Delete this payout record? The owner balance goes back up by this amount.', 'Delete', async () => { const { error } = await SB.from('owner_payouts').delete().eq('id', id); if (error) throw error; await loadMoney(); panel(); toast('Payout deleted'); });
      case 'pct-save': {
        const n = parseFloat($('#pct').value);
        if (!(n >= 0 && n <= 100)) return toast('Enter a percentage from 0 to 100');
        const { error } = await SB.from('payout_settings').upsert({ id: 1, commission_pct: n, updated_at: new Date().toISOString() }); if (error) throw error;
        M.pct = n; panel(); return toast('Commission saved');
      }
      case 'sum-csv': return csvDownload(`owner-payments-${istToday()}.csv`, [['Owner', 'Email', 'Bookings', 'Settled bookings', 'Settled revenue', 'Commission', 'Owner earning', 'Paid out', 'Balance due', 'Held (upcoming)'], ...ownerIds().map(i => { const s = ownerStats(i); return [ownerName(i), (ownerOf(i) || {}).email || '', s.n, s.settledN, s.collected, s.commission, s.earned, s.paidOut, s.due, s.held]; })]);
      case 'led-csv': return csvDownload(`owner-payouts-${istToday()}.csv`, [['Date', 'Owner', 'Amount', 'Method', 'Reference', 'Note'], ...M.payouts.map(p => [p.paid_on, ownerName(p.owner_id), rs(p.amount_paise), METHODS[p.method], p.reference, p.note])]);
    }
  } catch (err) { toast(err.message || 'Something went wrong'); }
}
app.addEventListener('click', moneyClick); dlg.addEventListener('click', moneyClick);
app.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('tr[data-m="bview"]')) bookingModal(e.target.dataset.id); });
