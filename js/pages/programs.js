/* Today's programs (Home, below Activities). Works like Popular destinations:
   anyone adds a program with the + button, an admin approves it, then it shows for everyone.
   Each program has a date and is free or paid. The "Today" chip on Home changes the date. */
let PG = { date: localDate(), pay: 'all' };               // pay: all | free | paid
const dparse = d => { const [y, m, dd] = String(d).split('-').map(Number); return new Date(y, m - 1, dd); };
const dnice = d => dparse(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
const dword = d => (d === localDate() ? 'Today' : d === localDate(1) ? 'Tomorrow' : dnice(d));
const tnice = t => { if (!t) return ''; const [h, m] = t.split(':').map(Number); return ((h % 12) || 12) + ':' + String(m).padStart(2, '0') + ' ' + (h < 12 ? 'AM' : 'PM'); };
const ICO_CAL = '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>';
const progTitle = () => (PG.date === localDate() ? 'Today’s programs' : 'Programs');
const priceTxt = p => (p.free ? 'Free' : money(p.price));

/* programs in the visitor's district (everywhere when no district is chosen) */
const progsIn = () => { const L = curLoc(); return S.progs.filter(p => !L || p.place_id === L.id); };
const progSort = (a, b) => a.date.localeCompare(b.date) || (a.time || '99').localeCompare(b.time || '99');
const progCard = p => `<div class="dest prog" role="link" tabindex="0" style='background-image:${shade},${bgUrl(p.photos[0])}' onclick="progOpen('${p.id}')" onkeydown="if(event.key==='Enter')progOpen('${p.id}')"><span class="pbg ${p.free ? 'fr' : 'pd'}">${esc(priceTxt(p))}</span><span class="pnm">${esc(p.name)}<small>${p.time ? esc(tnice(p.time)) + ' · ' : ''}${esc(p.town || p.city)}</small></span></div>`;

function psecHtml() {
  const L = curLoc(), all = progsIn().filter(p => p.date === PG.date).sort(progSort);
  const list = all.filter(p => PG.pay === 'all' || (PG.pay === 'free') === p.free);
  const none = `No ${PG.pay === 'all' ? '' : PG.pay + ' '}programs${L ? ' in ' + esc(L.city) : ''} on ${esc(dword(PG.date).toLowerCase() === 'today' ? 'today' : dnice(PG.date))} yet. Tap + to add one.`;
  return `<div class="prow"><button type="button" class="pdate" onclick="progPick()" aria-label="Change date">${ICO_CAL}<b>${esc(dword(PG.date))}</b><svg class="cv" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg></button>
<div class="hch" id="ppay">${[['all', 'All'], ['free', 'Free'], ['paid', 'Paid']].map(([v, l]) => `<button type="button" data-v="${v}" class="${PG.pay === v ? 'on' : ''}" onclick="progPay('${v}')">${l}</button>`).join('')}</div></div>
<div class="grid hs">${list.length ? list.map(progCard).join('') : `<div class="empty" style="flex:1 0 100%">${none}</div>`}</div>`;
}
function progPaint() { const el = $('#psec'), t = $('#ptl'); if (el) el.innerHTML = psecHtml(); if (t) t.textContent = progTitle(); }
function progPay(v) { PG.pay = v; progPaint(); }
function progSet(d) { PG.date = d; dlg.close(); progPaint(); }

/* "Today" chip: choose Today, Tomorrow or any date. Days that have programs are marked. */
function progPick() {
  const have = new Set(progsIn().map(p => p.date)), days = Array.from({ length: 14 }, (_, i) => localDate(i));
  modal('Choose a date', `<div class="pdays">${days.map(d => { const dt = dparse(d); return `<button type="button" class="pday${d === PG.date ? ' on' : ''}${have.has(d) ? ' has' : ''}" data-d="${d}"><small>${dt.toLocaleDateString('en-IN', { weekday: 'short' })}</small><b>${dt.getDate()}</b><small>${dt.toLocaleDateString('en-IN', { month: 'short' })}</small></button>`; }).join('')}</div>
<p class="sub" style="margin:10px 0 0">A dot means programs are listed that day.</p>
<label style="margin-top:14px">Or pick any date<input type="date" id="pdi" min="${localDate()}" value="${esc(PG.date)}"></label>
<div class="row"><button class="btn g" id="pdt">Today</button><button class="btn o" id="pdg">Show programs</button></div>`);
  $$('.pday').forEach(b => b.onclick = () => progSet(b.dataset.d));
  $('#pdt').onclick = () => progSet(localDate());
  $('#pdg').onclick = () => { const v = $('#pdi').value; if (!v || v < localDate()) return toast('Choose today or a later date'); progSet(v); };
}

/* program page (opened from a card): main photo, the other photos, then the video links as video cards that play in place */
let PGG = [], PGI = 0;
function pgSet(i) {
  const m = $('#pgm'), it = PGG[i]; if (!m || !it) return;
  $$('.pgts .pt').forEach((b, k) => b.classList.toggle('on', k === i)); PGI = i;
  const old = m.querySelector('iframe'); if (old) old.remove();
  if (typeof it === 'string') { m.classList.remove('vid'); m.removeAttribute('data-k'); m.style.backgroundImage = it; }
  else { m.classList.add('vid'); m.dataset.k = it.kind; m.style.backgroundImage = 'none'; m.insertAdjacentHTML('afterbegin', vFrame(it)); }
}
dlg.addEventListener('close', () => { const f = $('#pgm iframe'); if (f) f.remove(); });   // stop a playing video when the page is closed
function progOpen(id) {
  const p = S.progs.find(x => x.id === id); if (!p) return;
  const vemb = (p.videos || []).map(videoEmbed), vlinks = (p.videos || []).filter((u, k) => !vemb[k] && safeUrl(u));
  PGG = [...p.photos.map(bgUrl), ...vemb.filter(Boolean)]; PGI = 0;
  modal(esc(p.name), `<div class="pgv"><div class="phero" id="pgm" style='background-image:${PGG[0]}'></div>
${PGG.length > 1 ? `<div class="pts pgts">${PGG.map((x, i) => typeof x === 'string' ? `<button type="button" class="pt${i ? '' : ' on'}" aria-label="Photo ${i + 1}" onclick="pgSet(${i})" style='background-image:${x}'></button>` : `<button type="button" class="pt pv" aria-label="Play ${x.label} video" onclick="pgSet(${i})"><i>\u25b6</i><small>${x.label}</small></button>`).join('')}</div>` : ''}</div>
<div class="sum"><div><span>Date</span><span>${esc(dparse(p.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))}</span></div>${p.time ? `<div><span>Time</span><span>${esc(tnice(p.time))}</span></div>` : ''}<div><span>Entry</span><span><span class="pbg ${p.free ? 'fr' : 'pd'} inl">${p.free ? 'Free' : esc(money(p.price)) + ' per person'}</span></span></div><div><span>Place</span><span style="text-align:right">${esc(p.city)}, ${esc(p.state)}</span></div><div><span>Address</span><span style="text-align:right">${esc(p.location)}</span></div></div>
${p.desc ? `<p style="margin-top:10px">${esc(p.desc)}</p>` : ''}
<div class="row"><a class="btn g" style="text-decoration:none;display:inline-block" href="${esc(safeUrl(p.link))}" target="_blank" rel="noopener noreferrer">Open in Google Maps</a>${vlinks.map((u, k) => `<a class="btn o" style="text-decoration:none;display:inline-block" href="${esc(safeUrl(u))}" target="_blank" rel="noopener noreferrer">\u25b6 Watch video ${k + 1}</a>`).join('')}</div>`);
  const m = $('#pgm'); let x0 = null;                       // swipe the main photo on touch screens
  m.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
  m.addEventListener('touchend', e => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 40 && PGG.length > 1) pgSet((PGI + (dx < 0 ? 1 : PGG.length - 1)) % PGG.length); }, { passive: true });
}

/* View all: a separate page ("Today's programs") listing every upcoming program of the district, grouped by date, with the Free / Paid filter.
   Back returns to Home at the same spot. */
let PA = { pay: 'all' };
function progViewAll() { PA = { pay: 'all' }; go('allprog'); }
function paList() { return progsIn().filter(p => p.date >= localDate()).sort(progSort); }
function paBody() {
  const L = curLoc(), list = paList().filter(p => PA.pay === 'all' || (PA.pay === 'free') === p.free), by = new Map();
  list.forEach(p => (by.get(p.date) || by.set(p.date, []).get(p.date)).push(p));
  return list.length ? [...by].map(([d, L2]) => `<p class="rowlab">${esc(dword(d))}${d === localDate() || d === localDate(1) ? ' \u00b7 ' + esc(dnice(d)) : ''}<span class="sub"> \u00b7 ${L2.length}</span></p><div class="vagrid">${L2.map(progCard).join('')}</div>`).join('')
    : `<div class="empty">No ${PA.pay === 'all' ? '' : PA.pay + ' '}programs${L ? ' in ' + esc(L.city) : ''} yet. Go back and tap + to add one.</div>`;
}
function paPay(v) {
  PA.pay = v; $$('#papay button').forEach(b => b.classList.toggle('on', b.dataset.v === v));
  $('#pabody').innerHTML = paBody(); paSub();
}
function paSub() { const n = paList().filter(p => PA.pay === 'all' || (PA.pay === 'free') === p.free).length, L = curLoc(); $('#pasub').textContent = (L ? L.city + ' \u00b7 ' : '') + n + ' program' + (n === 1 ? '' : 's'); }
function rAllProg() {
  $('#allprog').innerHTML = `<section style="padding-top:100px"><div class="wrap"><div class="vahd"><button class="btn o sm" onclick="goBack('home')">\u2190 Back</button><div class="vat"><h1>Today\u2019s programs</h1><div class="sub" id="pasub"></div></div></div>
<div class="prow"><div class="hch" id="papay">${[['all', 'All'], ['free', 'Free'], ['paid', 'Paid']].map(([v, l]) => `<button type="button" data-v="${v}" class="${PA.pay === v ? 'on' : ''}" onclick="paPay('${v}')">${l}</button>`).join('')}</div></div>
<div id="pabody">${paBody()}</div></div></section>`;
  paSub();
}

/* ---- add a program ---- */
function progForm() {
  if (!S.places.length) return modal('Add a program', '<div class="empty"><p>Programs can be added once districts are available. Please check back soon.</p></div>');
  const ph = [], states = statesList();
  modal('Add a program', `<form id="pf" novalidate>
<p class="sub" style="margin-bottom:12px">Organising something? Share it. Our team reviews every program before it appears in Today’s programs.</p>
<p class="sub" style="margin-bottom:6px"><b>Photos</b> · up to 3 (1 main + 2 more), landscape <b>960 × 540 px (16:9)</b> or larger, under 8 MB each. They are cropped to 16:9 automatically.</p>
<div class="slots wide">${slotsHtml('psl', true)}</div><div class="err" id="e_pph"></div>
<div class="two" style="margin-top:12px">${fld('psn', 'Your name', '', 'text', 'Who is adding this program?', 'maxlength="60" autocomplete="name"')}${fld('psp', 'Your phone number', '', 'tel', 'e.g. 9876543210', 'maxlength="15" inputmode="tel" autocomplete="tel"')}</div>
<div style="margin-top:12px">${fld('pnm', 'Program name', '', 'text', 'e.g. Beach cleanup drive')}</div>
<div class="two" style="margin-top:12px">${fld('pdd', 'Program date', localDate(), 'date', '', `min="${localDate()}"`)}${fld('ptm', 'Start time (optional)', '', 'time')}</div>
<div style="margin-top:12px"><p class="sub" style="margin:0 0 6px"><b>Entry</b></p><div class="hch" id="ppy"><button type="button" data-v="free" class="on">Free</button><button type="button" data-v="paid">Paid</button></div><div class="err" id="e_ppy"></div>
<div id="ppw" hidden style="margin-top:8px">${fld('ppr', 'Ticket price per person (₹)', '', 'number', 'e.g. 300', 'min="1" max="100000" step="1" inputmode="numeric"')}</div></div>
<div class="two" style="margin-top:12px"><div><label>State<select id="pst"><option value="">Select state</option>${states.map(s => `<option>${esc(s)}</option>`).join('')}</select></label><div class="err" id="e_pst"></div></div>
<div><label>District<select id="pci" disabled><option value="">Select district</option></select></label><div class="err" id="e_pci"></div></div></div>
<div class="two" style="margin-top:12px">${fld('ptw', 'Town', '', 'text', 'e.g. Panchayath')}${fld('psr', 'Venue / street', '', 'text', 'e.g. Cliff Road')}</div>
<div style="margin-top:12px">${fld('plm', 'Landmark (optional)', '', 'text', 'e.g. Near the lighthouse')}</div>
<div style="margin-top:12px">${fld('pmp', 'Google Maps link', '', 'url', 'Paste the share link from Google Maps')}</div>
<div style="margin-top:12px"><p class="sub" style="margin:0 0 4px"><b>Video links</b> \u00b7 optional. YouTube, Instagram (post/reel) or Facebook. They come after the photos and play on the program page.</p><div id="pvw"></div><div class="err" id="e_pvd"></div><button type="button" class="btn o sm" id="pvadd">+ Add more link</button></div>
<label style="margin-top:12px">Description (optional)<textarea id="pde" rows="3" maxlength="600" placeholder="What happens at this program?"></textarea></label>
<div id="pacc" hidden class="pacc"></div>
<input id="php" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;opacity:0">
<div class="row"><button class="btn g" id="pgo">Submit program</button></div></form>`);

  let free = true, accMode = 'new';
  const paAcc = () => {
    const el = $('#pacc'); if (!el) return;
    if (S.session && S.account) { el.innerHTML = `<p class="sub" style="margin:0"><b>Paid program</b> · this will be added with your business account <b>${esc(S.account.business || S.account.name || S.account.email || '')}</b>.</p>`; return; }
    el.innerHTML = `<p class="sub" style="margin:0 0 8px"><b>An account is needed for paid programs.</b> ${accMode === 'new' ? 'Create one now, you will be logged in automatically and it will appear in your Profile.' : 'Log in to your business account.'}</p>
<div class="hch" id="pat"><button type="button" data-v="new" class="${accMode === 'new' ? 'on' : ''}">Create new account</button><button type="button" data-v="in" class="${accMode === 'in' ? 'on' : ''}">I have an account</button></div>
<div style="margin-top:10px">${fld('pae', 'Email', '', 'email', 'you@example.com', 'autocomplete="email"')}</div>
<div class="two" style="margin-top:10px">${fld('pap', 'Password', '', 'password', accMode === 'new' ? 'At least 6 characters' : '', 'autocomplete="' + (accMode === 'new' ? 'new-password' : 'current-password') + '"')}${accMode === 'new' ? fld('pac', 'Confirm password', '', 'password', '', 'autocomplete="new-password"') : ''}</div>
${accMode === 'new' ? '<p class="sub" style="margin:6px 0 0">Your name and phone number above are used for the new account.</p>' : ''}`;
    $$('#pat button').forEach(b => b.onclick = () => { accMode = b.dataset.v; paAcc(); });
  };
  $$('#ppy button').forEach(b => b.onclick = () => { free = b.dataset.v === 'free'; $$('#ppy button').forEach(x => x.classList.toggle('on', x === b)); $('#ppw').hidden = free; $('#pacc').hidden = free; if (!free) { paAcc(); $('#ppr').focus(); } });
  $('#pst').onchange = () => {
    const s = $('#pst').value;
    $('#pci').innerHTML = '<option value="">Select district</option>' + S.places.filter(p => p.state === s).sort((a, b) => a.city.localeCompare(b.city)).map(p => `<option value="${p.id}">${esc(p.city)}</option>`).join('');
    $('#pci').disabled = !s;
  };
  const L = curLoc(); if (L) { $('#pst').value = L.state; $('#pst').onchange(); $('#pci').value = L.id; }
  photoSlots('#pf', 'psl', ph, $('#e_pph'), crop169, true);
  const PV = vlRows($('#pvw'), $('#pvadd'), $('#e_pvd'), []);

  $('#pf').onsubmit = async e => {
    e.preventDefault(); $$('#pf .err').forEach(x => x.textContent = '');
    const v = id => $('#' + id).value.trim(), E = {}, pl = placeById(v('pci')), price = Math.round(+v('ppr'));
    if (!ph[0]) E.pph = 'Add the main photo';
    if (v('psn').length < 2) E.psn = 'Enter your name'; else if (v('psn').length > 60) E.psn = 'Max 60 characters';
    if (!/^\d{10,15}$/.test(v('psp').replace(/[\s+\-()]/g, ''))) E.psp = 'Enter a valid phone number (10 to 15 digits)';
    if (v('pnm').length < 2) E.pnm = 'Enter the program name'; else if (v('pnm').length > 80) E.pnm = 'Max 80 characters';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v('pdd'))) E.pdd = 'Choose the program date'; else if (v('pdd') < localDate()) E.pdd = 'The date cannot be in the past';
    if (!free && !(price >= 1 && price <= 100000)) E.ppr = 'Enter the ticket price (₹1 to ₹1,00,000)';
    if (!v('pst')) E.pst = 'Choose a state';
    if (!pl) E.pci = 'Choose a district';
    if (v('ptw').length < 2) E.ptw = 'Enter the town'; else if (v('ptw').length > 60) E.ptw = 'Max 60 characters';
    if (v('psr').length < 2) E.psr = 'Enter the venue or street'; else if (v('psr').length > 100) E.psr = 'Max 100 characters';
    if (v('plm') && (v('plm').length < 2 || v('plm').length > 80)) E.plm = 'Use 2 to 80 characters';
    if (!MAPS_OK.test(v('pmp'))) E.pmp = 'Paste a Google Maps link (google.com/maps or maps.app.goo.gl)';
    if (PV.get().some(x => !videoEmbed(x))) E.pvd = 'Use a full YouTube, Instagram (post/reel) or Facebook video link';
    const needAcc = !free && !(S.session && S.account);
    if (needAcc) {
      if (!/^\S+@\S+\.\S+$/.test(v('pae'))) E.pae = 'Enter a valid email';
      if (accMode === 'in') { if (!$('#pap').value) E.pap = 'Enter your password'; }
      else { if ($('#pap').value.length < 6) E.pap = 'At least 6 characters'; else if ($('#pap').value !== $('#pac').value) E.pac = 'Passwords do not match'; }
    }
    if (Object.keys(E).length) { for (const k in E) $('#e_' + k).textContent = E[k]; return; }
    if ($('#php').value) return progThanks();                       // honeypot
    if (!API.ready()) return toast('Supabase is not configured (js/config.js)');
    const b = $('#pgo'); b.disabled = true; b.textContent = 'Sending…';
    try {
      if (needAcc) {
        try {
          if (accMode === 'new') { const r = await API.signUp(v('pae'), $('#pap').value, v('psn'), v('psp').replace(/[\s+\-()]/g, '')); if (!r.session) { b.disabled = false; b.textContent = 'Submit program'; accMode = 'in'; paAcc(); return toast('Check your email to confirm your account, then choose “I have an account”, log in and submit again'); } }
          else await API.signIn(v('pae'), $('#pap').value);
          await afterAuth();
        } catch (ae) { b.disabled = false; b.textContent = 'Submit program'; const el = $('#e_pap'); if (el) el.textContent = ae.message || 'Could not sign in'; return; }
      }
      await API.submitProgram({ owner: (!free && S.session && S.account) ? S.account.id : null, sname: v('psn'), sphone: v('psp').replace(/[\s+\-()]/g, ''), name: v('pnm'), place_id: pl.id, state: pl.state, city: pl.city, town: v('ptw'), street: v('psr'), landmark: v('plm'),
        location: `${v('psr')}, ${v('ptw')}` + (v('plm') ? ` (near ${v('plm')})` : ''), maps_link: v('pmp'), date: v('pdd'), time: v('ptm'), free, price, description: v('pde'), videos: PV.get(), photos: ph.filter(Boolean) });
      progThanks();
    } catch (err) { b.disabled = false; b.textContent = 'Submit program'; toast(/function|schema|relation/i.test(err.message || '') ? 'Run the latest supabase/schema.sql first' : (err.message || 'Could not send. Please try again.')); }
  };
}
function progThanks() {
  modal('Thank you!', `<div style="text-align:center;padding:10px 0 4px"><p style="font-size:1.1rem;font-weight:600;margin-bottom:8px">Your program has been submitted.</p><p class="sub">Our team will review it. Once an admin approves it, it will appear on its date in Today’s programs for everyone.</p><div class="row" style="justify-content:center;margin-top:18px"><button class="btn g" onclick="dlg.close()">Done</button></div></div>`);
}
