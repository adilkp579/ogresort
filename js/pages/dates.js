/* ===== My dates (owner calendar) + availability for guests =====
   green = booked by a guest, red = reserved by the owner, white = available. Guests can never book a green or red date. */
let DT = { k: 'stay', id: '' }, DTM = {}, DTA = null, DTMODE = 'reserve';
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const dIso = (y, m, d) => y + '-' + String(m + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
const eachDay = (a, z) => { const o = []; for (let t = Date.parse(a + 'T00:00:00Z'), e = Date.parse(z + 'T00:00:00Z'); t <= e; t += 864e5) o.push(new Date(t).toISOString().slice(0, 10)); return o; };
function monthsFrom(n) { const t = new Date(); let y = t.getFullYear(), m = t.getMonth(); const o = []; for (let i = 0; i < n; i++) { o.push([y, m]); if (++m > 11) { m = 0; y++; } } return o; }
function monthHtml(y, m, cell) {
  const dim = new Date(Date.UTC(y, m + 1, 0)).getUTCDate(), off = (new Date(Date.UTC(y, m, 1)).getUTCDay() + 6) % 7;
  let h = `<div class="calm"><div class="calh">${MONTHS[m]} ${y} <span class="sub">\u00b7 1\u2013${dim}</span></div><div class="calg calw">${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(x => `<span>${x}</span>`).join('')}</div><div class="calg">` + '<i></i>'.repeat(off);
  for (let d = 1; d <= dim; d++) h += cell(dIso(y, m, d), d);
  return h + '</div></div>';
}
const dtItem = id => S.props.find(p => p.id === id) || S.prods.find(p => p.id === id);
function datesGo(k, id) { DT = { k, id }; DTM = {}; DTA = null; go('dates'); }
async function availMap(id, ref) { const rows = await API.unavailable(id, ref), m = {}; rows.forEach(r => { const o = m[r.day]; if (!o || r.src === 'guest') m[r.day] = { kind: r.kind, src: r.src }; }); return m; }

/* ---- owner page ---- */
function rDates() {
  const r = dtItem(DT.id), own = !!(S.account && r && (r.owner === S.account.id || r.owner === 'me'));
  if (!own) { $('#dates').innerHTML = '<section style="padding-top:100px"><div class="wrap"><div class="empty"><p>Open My dates from one of your uploads in Profile.</p><button class="btn g sm" style="margin-top:12px" onclick="go(\'profile\')">Go to Profile</button></div></div></section>'; return; }
  const act = DT.k === 'act';
  $('#dates').innerHTML = `<section style="padding-top:100px"><div class="wrap"><button class="btn o sm" onclick="goBack('profile')">\u2190 Back</button><h2 style="margin-top:12px">My dates</h2><p class="sub">${esc(r.name)}</p>
<div class="calk"><span><i class="cd bk"></i>Booked by guest</span><span><i class="cd bl"></i>Reserved by you</span><span><i class="cd"></i>Available</span></div>
<p class="sub" style="margin:10px 0 6px">Guests cannot book green (booked) or red (reserved) dates. ${act ? 'A booked day is closed for other guests.' : 'The check-out day stays free for the next guest.'}</p>
<div class="tabs" id="dtm"><button data-m="reserve">Reserve</button><button data-m="free">Make free</button></div>
<p class="sub" id="dthint"></p><div id="dtc"><p class="sub">Loading dates\u2026</p></div></div></section>`;
  const hint = () => { $('#dthint').textContent = DTA ? `Start: ${DTA}. Tap the last date (or the same date again for one day).` : ({ reserve: 'Reserve (red) dates you cannot offer or have given to your own guest: tap the first date, then the last date. Tap a red date again to make it free.', free: 'Make your reserved (red) dates free again: tap the first date, then the last date.' })[DTMODE]; };
  const setMode = m => { DTMODE = m; DTA = null; $$('#dtm button').forEach(b => b.classList.toggle('on', b.dataset.m === m)); hint(); dtPaint(); };
  $('#dtm').onclick = e => { const b = e.target.closest('button'); if (b) setMode(b.dataset.m); };
  const draw = () => { $('#dtc').innerHTML = monthsFrom(12).map(([y, m]) => monthHtml(y, m, (iso, d) => `<button type="button" class="cd" data-d="${iso}">${d}</button>`)).join(''); dtPaint(); };
  $('#dtc').onclick = e => {
    const b = e.target.closest('.cd[data-d]'); if (!b) return; const iso = b.dataset.d, x = DTM[iso];
    if (!DTA) { if (x && x.src === 'guest') return toast(dtGuest(iso));
      if (x && x.src === 'owner' && DTMODE === 'reserve') { dtApply(iso, iso, 'free'); return; }
      DTA = iso; hint(); dtPaint(); return; }
    const a = DTA < iso ? DTA : iso, z = DTA < iso ? iso : DTA; DTA = null; hint(); dtApply(a, z);
  };
  setMode(DTMODE);
  (API.ready() ? availMap(DT.id) : Promise.resolve({})).then(m => { DTM = m; draw(); });
}
function dtPaint() {
  const t = today();
  $$('#dtc .cd[data-d]').forEach(b => {
    const iso = b.dataset.d, x = DTM[iso];
    b.className = 'cd' + (iso < t ? ' past' : '') + (x ? (x.src === 'guest' ? ' bk' : ' bl') : '') + (DTA === iso ? ' sel' : '');
    b.title = x ? (x.src === 'guest' ? 'Booked by a guest' : 'Reserved by you') : 'Available';
  });
}
function dtGuest(iso) {
  const b = S.inbox.find(x => (x.rid === DT.id || x.aid === DT.id) && ['Pending', 'Upcoming', 'Completed'].includes(x.status) && (x.k === 'stay' ? (x.in <= iso && iso < x.out) : x.date === iso));
  return b ? `Booked by ${b.guest} (Ref ${b.id}${b.status === 'Pending' ? ', awaiting your confirmation' : ''}). Manage it in Bookings.` : 'Booked by a guest. Manage it in Bookings.';
}
async function dtApply(a, z, mode) {
  const M = mode || DTMODE;
  const all = eachDay(a, z), t = today(); if (all.length > 62) return toast('Choose up to 62 days at a time');
  const days = all.filter(d => d >= t && (M === 'free' ? (DTM[d] && DTM[d].src === 'owner') : !(DTM[d] && DTM[d].src === 'guest')));
  if (!days.length) return toast(M === 'free' ? 'No reserved or blocked days in that range' : 'Those dates are already booked by guests');
  const kind = M === 'reserve' ? 'reserved' : 'free', old = {}; days.forEach(d => old[d] = DTM[d]);
  days.forEach(d => { if (kind === 'free') delete DTM[d]; else DTM[d] = { kind: 'blocked', src: 'owner' }; }); dtPaint();
  try { await API.setDays(DT.id, days, kind); toast(kind === 'free' ? 'Dates are free again' : 'Dates reserved'); }
  catch (e) { days.forEach(d => { if (old[d]) DTM[d] = old[d]; else delete DTM[d]; }); dtPaint(); toast(/listing_days/.test(e.message || '') ? 'Run the latest supabase/schema.sql first' : (e.message || 'Could not save')); }
}

/* ---- guests: availability under the date fields (green / red dates cannot be booked) ---- */
function availAttach(o) {
  const wrap = document.createElement('div'); wrap.className = 'avx';
  wrap.innerHTML = '<div class="err avm" id="avm"></div><button type="button" class="btn o sm" id="avt">Check available dates</button><div class="avc" id="avc" hidden></div>';
  o.anchor.after(wrap);
  const cal = wrap.querySelector('#avc'), msg = wrap.querySelector('#avm'), tg = wrap.querySelector('#avt'); let T = null;
  const taken = d => !!(T && T[d]), nightsTaken = (a, z) => eachDay(a, z).slice(0, -1).some(taken);
  const conflict = () => { if (!T) return false; const a = o.inEl.value; if (!a) return false; if (o.single) return taken(a); const z = o.outEl && o.outEl.value; return z ? nightsTaken(a, z) : taken(a); };
  const open = () => { cal.hidden = false; tg.textContent = 'Hide calendar'; drawCal(); try { cal.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) {} };
  const show = focus => {
    if (conflict()) { msg.innerHTML = `${o.single ? 'This date is' : 'These dates are'} not available (booked or reserved). <button type="button" class="btn sm" id="avchg">Change the date</button>`; wrap.querySelector('#avchg').onclick = open; if (focus) open(); }
    else msg.textContent = '';
  };
  tg.onclick = () => { if (cal.hidden) open(); else { cal.hidden = true; tg.textContent = 'Check available dates'; } };
  const fire = el => el && el.dispatchEvent(new Event('input', { bubbles: true }));
  function drawCal() {
    const t = today(), a = o.inEl.value, z = o.outEl ? o.outEl.value : '';
    cal.innerHTML = '<div class="calk"><span><i class="cd bk"></i>Booked</span><span><i class="cd bl"></i>Reserved by owner</span><span><i class="cd"></i>Available</span></div>' +
      monthsFrom(6).map(([y, m]) => monthHtml(y, m, (iso, d) => { const x = T && T[iso], sel = iso === a || (z && iso === z), rng = a && z && iso > a && iso < z; return `<button type="button" class="cd${iso < t ? ' past' : ''}${x ? (x.src === 'guest' ? ' bk' : ' bl') : ''}${sel ? ' pick' : rng ? ' rng' : ''}" data-d="${iso}">${d}</button>`; })).join('');
  }
  cal.onclick = e => {
    const b = e.target.closest('.cd[data-d]'); if (!b) return; const d = b.dataset.d;
    if (o.single) { if (taken(d)) return toast('That date is not available'); o.inEl.value = d; fire(o.inEl); show(); drawCal(); return; }
    const a = o.inEl.value, z = o.outEl.value;
    if (!a || z || d <= a) { if (taken(d)) return toast('That date is not available'); o.inEl.value = d; o.outEl.value = ''; fire(o.inEl); fire(o.outEl); show(); drawCal(); return; }
    if (nightsTaken(a, d)) return toast('Some dates in between are not available');
    o.outEl.value = d; fire(o.outEl); show(); drawCal();
  };
  [o.inEl, o.outEl].forEach(el => el && el.addEventListener('input', () => { show(); if (!cal.hidden) drawCal(); }));
  if (API.ready()) availMap(o.id, o.ref).then(m => { T = m; show(); if (!cal.hidden) drawCal(); });
  return { conflict, show };
}
