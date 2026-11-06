/* Popular destinations, in this order: state cards -> district cards -> destination cards of the selected district.
   States and districts exist only if the admin added them. Anyone can suggest a destination with the + button
   (only inside an admin-added district); it shows publicly after admin approval. */
let DEST_TYPES = ['Beach', 'Hill station', 'Backwaters', 'Waterfall', 'Forest & wildlife', 'Heritage & culture', 'Temple & pilgrimage', 'Adventure', 'Park & garden'];
const NEWTYPE = '__new__';
/* default types + any type already used by an approved destination (so types people created earlier are reusable) */
const destTypes = () => { const seen = new Set(), out = []; [...DEST_TYPES, ...S.dests.map(d => d.type)].forEach(t => { t = String(t || '').trim(); const k = t.toLowerCase(); if (t && k !== 'other' && !seen.has(k)) { seen.add(k); out.push(t); } }); return out; };
let HST = '';                                                    // state chosen in the states row
const statesList = () => [...new Set(S.places.map(p => p.state))].sort();
const stateRow = st => (S.states || []).find(x => x.name.toLowerCase() === String(st).toLowerCase());
const statePhotos = st => { const r = stateRow(st); return r && r.photos && r.photos.length ? r.photos : S.places.filter(p => p.state === st).flatMap(p => p.photos || []); };
const bgOf = (url, k) => (url ? bgUrl(url) : scene('#163D32', '#C5A46D', k, 'forest'));
const shade = 'linear-gradient(0deg,#0008,#0000)';

/* destinations: same town first, then same district, then nearer districts */
const destNear = L => L.slice().sort(nearCmp);
const deCard = d => { const s = dsoc(d.id); return `<div class="dest" role="link" tabindex="0" data-did="${d.id}" style='background-image:${shade},${bgUrl(d.photos[0])}' onclick="placeGoDest('${d.id}')" onkeydown="if(event.key==='Enter')placeGoDest('${d.id}')"><div class="dsa">${socBtns(d.id, s)}</div>${esc(d.name || d.city)}</div>`; };

/* ---- View all: its own page "All destinations" with the district name + Back at the top; every destination card of that district, 2 per row on mobile, 4 on desktop ---- */
let VA = { placeId: '' };
function destViewAll() { const L = curLoc(); VA = { placeId: L ? L.id : '' }; go('alldest'); }
function rAllDest() {
  const P = VA.placeId ? placeById(VA.placeId) : null;
  if (VA.placeId && !P) return go('home');
  const list = destNear(S.dests.filter(d => !P || d.place_id === P.id));
  $('#alldest').innerHTML = `<section style="padding-top:100px"><div class="wrap"><div class="vahd"><button class="btn o sm" onclick="goBack('home')">\u2190 Back</button><div class="vat"><h1>${P ? esc(P.city) : 'All destinations'}</h1><div class="sub">${P ? esc(P.state) + ' \u00b7 ' : ''}${list.length} destination${list.length === 1 ? '' : 's'}</div></div></div>
${list.length ? `<div class="vagrid">${list.map(deCard).join('')}</div>` : `<div class="empty">No destinations${P ? ' in ' + esc(P.city) : ''} yet. Go back and tap + to add one.</div>`}</div></section>`;
}

function dsecHtml() {
  const L = curLoc(), states = statesList();
  if (!states.length) return '<div class="empty">No states or districts have been added yet.</div>';
  if (!states.includes(HST)) HST = (L && L.state) || states[0];
  const stCard = (s, i) => { return `<button class="dest${s === HST ? ' on' : ''}" style='background-image:${shade},${bgOf(statePhotos(s)[0], i + 1)}' onclick="pickState(${i})">${esc(s)}</button>`; };
  const dsCard = (p, i) => `<button class="dest${L && L.id === p.id ? ' on' : ''}" style='background-image:${shade},${bgOf(p.photos && p.photos[0], i + 3)}' onclick="districtGo('${p.id}')">${esc(p.city)}</button>`;
  /* Visitor's own location known: ONE row -> 1st card = their state, 2nd = their district, then that district's destination cards */
  if (L) {
    const dstL = destNear(S.dests.filter(d => d.place_id === L.id));
    const stOwn = `<button class="dest" style='background-image:${shade},${bgOf(statePhotos(L.state)[0], 1)}' onclick="stateGo(${JSON.stringify(L.state).replace(/"/g, '&quot;')})">${esc(L.state)}</button>`;
    const dsOwn = `<button class="dest on" style='background-image:${shade},${bgOf(L.photos && L.photos[0], 3)}' onclick="districtGo('${L.id}')">${esc(L.city)}</button>`;
    return `<p class="rowlab">Popular in ${esc(L.city)}, ${esc(L.state)}</p><div class="grid hs">${stOwn}${dsOwn}${dstL.map(deCard).join('')}</div>${dstL.length ? '' : `<div class="empty">No destinations in ${esc(L.city)} yet. Tap + to add one.</div>`}`;
  }
  const ds = S.places.filter(p => p.state === HST).sort((a, b) => a.city.localeCompare(b.city));
  const dst = destNear(S.dests.filter(d => !L || d.place_id === L.id));
  return `<p class="rowlab">States</p><div class="grid hs">${states.map(stCard).join('')}</div>
<p class="rowlab">Districts in ${esc(HST)}</p><div class="grid hs">${ds.map(dsCard).join('')}</div>
<p class="rowlab">${L ? 'Popular in ' + esc(L.city) : 'Popular destinations'}</p><div class="grid hs">${dst.length ? dst.map(deCard).join('') : `<div class="empty" style="flex:1 0 100%">No destinations${L ? ' in ' + esc(L.city) : ''} yet. Tap + to add one.</div>`}</div>`;
}
/* ---- likes + comments (1 like and 1 comment per device per destination, enforced by the database) ---- */
const dsoc = id => (S.dsoc && S.dsoc[id]) || { likes: 0, comments: 0, liked: false, commented: false };
const ICO_HEART = '<svg viewBox="0 0 24 24"><path d="M12 20.5s-7.8-4.7-9.6-9.6C1.2 7.700 3.200 4.500 6.500 4.500c2.100 0 3.700 1.200 5.500 3.200 1.800-2 3.400-3.200 5.500-3.200 3.300 0 5.300 3.200 4.100 6.400-1.800 4.900-9.600 9.600-9.600 9.600z"/></svg>';
const ICO_CHAT = '<svg viewBox="0 0 24 24"><path d="M21 11.500a8.500 8.500 0 0 1-12.300 7.600L3.500 20.500l1.500-4.600A8.500 8.500 0 1 1 21 11.500z"/></svg>';
const socBtns = (id, s) => `<button type="button" class="dsb lk${s.liked ? ' on' : ''}" aria-label="Like" aria-pressed="${s.liked}" onclick="event.stopPropagation();destLike('${id}')">${ICO_HEART}<b>${s.likes}</b></button><button type="button" class="dsb cmb${s.commented ? ' me' : ''}" aria-label="Comments" onclick="event.stopPropagation();destComments('${id}')">${ICO_CHAT}<b>${s.comments}</b></button>`;
const socBar = id => `<div class="psoc" data-did="${id}">${socBtns(id, dsoc(id))}<span class="sub">Tap the comment icon to read or add comments</span></div>`;
function dsocPaint(id) {                      // update every card / bar for this destination in place (keeps scroll position)
  const s = dsoc(id);
  $$(`[data-did="${id}"] .lk`).forEach(b => { b.classList.toggle('on', s.liked); b.setAttribute('aria-pressed', s.liked); b.querySelector('b').textContent = s.likes; });
  $$(`[data-did="${id}"] .cmb`).forEach(b => { b.classList.toggle('me', s.commented); b.querySelector('b').textContent = s.comments; });
}
const isDest = id => (S.dests || []).some(d => d.id === id);
const SOCBUSY = new Set();
async function destLike(id) {
  if (SOCBUSY.has(id)) return; SOCBUSY.add(id);
  try { const r = await (isDest(id) ? API.destLike(id) : API.listingLike(id)); (S.dsoc = S.dsoc || {})[id] = { ...dsoc(id), liked: r.liked, likes: r.likes }; dsocPaint(id); }
  catch (e) { toast(/function|schema/i.test(e.message || '') ? 'Run the latest supabase/schema.sql first' : (e.message || 'Could not like')); }
  finally { SOCBUSY.delete(id); }
}
async function destComments(id) {
  const d = S.dests.find(x => x.id === id) || dtItem(id); if (!d) return;
  /* ONE loading state: the final glass sheet opens straight away with skeleton rows, then the real content replaces them */
  const sk = '<span class="cmskb"'; 
  modal(esc(d.name || d.city), `<div class="cmsum">${sk} style="width:120px;height:26px"></span>${sk} style="width:80px;height:12px"></span></div><div class="cml" aria-busy="true" aria-label="Loading comments">${[0, 1, 2].map(() => `<article class="cmi cmsk">${sk} style="flex:0 0 40px;width:40px;height:40px;border-radius:50%"></span><div class="cmc">${sk} style="width:42%;height:13px"></span>${sk} style="width:92%;height:11px;margin-top:10px"></span>${sk} style="width:68%;height:11px;margin-top:6px"></span></div></article>`).join('')}</div>`);
  dlg.classList.add('glass');
  let rows;
  try { rows = await (isDest(id) ? API.destComments(id) : API.listingComments(id)); } catch (e) { modal(esc(d.name || d.city), `<div class="empty"><p>${esc(/function|schema/i.test(e.message || '') ? 'Comments are not set up yet. Run the latest supabase/schema.sql.' : (e.message || 'Could not load comments'))}</p></div>`); dlg.classList.add('glass'); return; }
  const mine = rows.some(r => r.mine);
  (S.dsoc = S.dsoc || {})[id] = { ...dsoc(id), comments: rows.length, commented: mine }; dsocPaint(id);
  const ini = n => (String(n).trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('') || '?').toUpperCase();
  const hue = n => { let h = 0; for (const c of String(n)) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
  const ago = t => { const m = Math.max(0, (Date.now() - Date.parse(t)) / 6e4); if (m < 1) return 'Just now'; if (m < 60) return Math.floor(m) + ' min ago'; if (m < 1440) return Math.floor(m / 60) + ' h ago'; if (m < 10080) return Math.floor(m / 1440) + ' d ago'; return new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }); };
  const list = rows.length ? rows.map(r => `<article class="cmi${r.mine ? ' mine' : ''}"><span class="cav" style="--h:${hue(r.name)}">${esc(ini(r.name))}</span><div class="cmc"><div class="cmh"><b>${esc(r.name)}</b>${r.mine ? '<span class="cyou">You</span>' : ''}<time class="sub" datetime="${esc(r.created_at)}">${ago(r.created_at)}</time></div><p>${esc(r.body)}</p></div></article>`).join('') : '<div class="cmz"><svg viewBox="0 0 24 24"><path d="M21 11.5a8.5 8.5 0 0 1-12.3 7.6L3.5 20.5l1.5-4.6A8.5 8.5 0 1 1 21 11.5z"/></svg><b>No comments yet</b><span>Be the first to share your experience.</span></div>';
  const me = (S.profile && S.profile.name) || '';
  const form = mine ? '<div class="cmdone"><svg viewBox="0 0 24 24"><path d="M5 12l5 5L20 7"/></svg>Thanks for commenting</div>' : `<form id="cmf" class="cmf" novalidate><div class="cmft">Add your comment</div><label>Your name<input id="cmn" maxlength="40" autocomplete="name" placeholder="Your name" value="${esc(me)}"></label><label>Comment<textarea id="cmt" rows="3" maxlength="300" placeholder="Share your experience (no links)"></textarea></label><div class="cmfb"><span class="sub" id="cmc">0 / 300</span><button class="btn g" id="cmgo">Post comment</button></div><div class="err" id="e_cm"></div><p class="cmnote">One comment per card from this device. Rude or adult (18+) comments are removed by our team.</p></form>`;
  modal(esc(d.name || d.city), `<div class="cmsum"><span class="cmct"><b>${rows.length}</b> comment${rows.length === 1 ? '' : 's'}</span><span class="sub">Guest feedback</span></div><div class="cml">${list}</div>${form}`);
  dlg.classList.add('glass');
  const fm = $('#cmf'); if (!fm) return;
  $('#cmt').oninput = e => { $('#cmc').textContent = e.target.value.length + ' / 300'; };
  fm.onsubmit = async e => {
    e.preventDefault(); $('#e_cm').textContent = '';
    const n = $('#cmn').value.trim(), t = $('#cmt').value.trim();
    if (!n) return $('#e_cm').textContent = 'Enter your name';
    if (t.length < 2) return $('#e_cm').textContent = 'Write a comment (at least 2 characters)';
    const b = $('#cmgo'); b.disabled = true; b.textContent = 'Posting…';
    try { await (isDest(id) ? API.destComment(id, n, t) : API.listingComment(id, n, t)); toast('Comment posted'); destComments(id); }
    catch (err) { b.disabled = false; b.textContent = 'Post comment'; $('#e_cm').textContent = err.message || 'Could not post'; }
  };
}

/* ---- Famous destinations: admin-chosen cards for a state page or a district page, scrolling left to right above Stays / Activities ---- */
const famFor = () => (S.famous || []).filter(f => PLC.placeId ? f.place_id === PLC.placeId : (!!PLC.state && !f.place_id && f.state === PLC.state));
function famOpen(id) {
  const f = (S.famous || []).find(x => x.id === id); if (!f) return;
  if (f.destination_id && S.dests.some(d => d.id === f.destination_id)) return placeGoDest(f.destination_id);
  if (f.place_id && f.place_id !== PLC.placeId) return districtGo(f.place_id);
}
function famHtml() {
  if (PLC.destId) return '';
  const F = famFor().map(f => { const d = f.destination_id ? S.dests.find(x => x.id === f.destination_id) : null; return f.destination_id && !d ? null : { id: f.id, title: d ? (d.name || d.city) : f.title, sub: d ? d.type : f.subtitle, photo: d ? d.photos[0] : f.photo }; }).filter(Boolean);
  if (!F.length) return '';
  return `<h3 class="pch" style="margin-top:22px">Famous destinations <span class="sub">${F.length}</span></h3><div class="grid hs famrow">${F.map(f => `<div class="dest fam" role="link" tabindex="0" style='background-image:${shade},${bgUrl(f.photo)}' onclick="famOpen('${f.id}')" onkeydown="if(event.key==='Enter')famOpen('${f.id}')"><span>${esc(f.title)}${f.sub ? `<small>${esc(f.sub)}</small>` : ''}</span></div>`).join('')}</div>`;
}
function pickState(i) { HST = statesList()[i]; const el = $('#dsec'); if (el) el.innerHTML = dsecHtml(); }

function destForm() {
  if (!S.places.length) return modal('Add a destination', '<div class="empty"><p>Destinations can be added once districts are available. Please check back soon.</p></div>');
  const ph = [], states = statesList();
  modal('Add a destination', `<form id="df" novalidate>
<p class="sub" style="margin-bottom:12px">Know a great place? Share it. Our team reviews every submission before it appears in Popular destinations.</p>
<p class="sub" style="margin-bottom:6px"><b>Photos</b> · up to 3 (1 main + 2 more). Upload landscape photos, <b>960 × 540 px (16:9)</b> or larger in the same shape, under 8 MB each. They are cropped to 16:9 automatically. <b>Tip:</b> tap a box and select all 3 photos together.</p>
<div class="slots wide">${slotsHtml('dsl', true)}</div><div class="err" id="e_dph"></div>
<div style="margin-top:12px">${fld('dnm', 'Destination name', '', 'text', 'e.g. Papanasam Beach')}</div>
<div class="two" style="margin-top:12px"><div><label>State<select id="dst"><option value="">Select state</option>${states.map(s => `<option>${esc(s)}</option>`).join('')}</select></label><div class="err" id="e_dst"></div></div>
<div><label>District<select id="dci" disabled><option value="">Select district</option></select></label><div class="err" id="e_dci"></div></div></div>
<div class="two" style="margin-top:12px">${fld('dtw', 'Town', '', 'text', 'e.g. Panchayath')}${fld('dsr', 'Street', '', 'text', 'e.g. Cliff Road')}</div>
<div style="margin-top:12px">${fld('dlm', 'Landmark (optional)', '', 'text', 'e.g. Near the lighthouse')}</div>
<div style="margin-top:12px">${fld('dmp', 'Google Maps link', '', 'url', 'Paste the share link from Google Maps')}</div>
<div style="margin-top:12px"><p class="sub" style="margin:0 0 4px"><b>Video links</b> \u00b7 optional. YouTube, Instagram (post/reel) or Facebook. They come after the photos and play on the destination page.</p><div id="dvw"></div><div class="err" id="e_dvd"></div><button type="button" class="btn o sm" id="dvadd">+ Add more link</button></div>
<div style="margin-top:12px"><label>Type of location<select id="dty"><option value="">Select type</option>${destTypes().map(t => `<option value="${esc(t)}">${esc(t)}</option>`).join('')}<option value="${NEWTYPE}">+ Create new type…</option></select></label><div class="err" id="e_dty"></div>
<div id="dtnw" hidden style="margin-top:8px"><label>New type name<input id="dtn" maxlength="40" placeholder="e.g. Tea estate, Houseboat point" autocomplete="off"></label><div class="err" id="e_dtn"></div></div></div>
<label style="margin-top:12px">Description (optional)<textarea id="dde" rows="3" maxlength="600" placeholder="Why is it special?"></textarea></label>
<input id="dhp" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;opacity:0">
<div class="row"><button class="btn g" id="dgo">Submit destination</button></div></form>`);

  $('#dst').onchange = () => {
    const s = $('#dst').value;
    $('#dci').innerHTML = '<option value="">Select district</option>' + S.places.filter(p => p.state === s).sort((a, b) => a.city.localeCompare(b.city)).map(p => `<option value="${p.id}">${esc(p.city)}</option>`).join('');
    $('#dci').disabled = !s;
  };
  $('#dty').onchange = () => { const nw = $('#dty').value === NEWTYPE; $('#dtnw').hidden = !nw; if (nw) $('#dtn').focus(); };
  const L = curLoc(); if (L) { $('#dst').value = L.state; $('#dst').onchange(); $('#dci').value = L.id; }

  const DV = vlRows($('#dvw'), $('#dvadd'), $('#e_dvd'), []);
  /* Select all 3 photos at once (tap any slot, pick up to 3): they fill Main, Photo 2, Photo 3 in order. One photo fills the slot you tapped. */
  photoSlots('#df', 'dsl', ph, $('#e_dph'), crop169, true);

  $('#df').onsubmit = async e => {
    e.preventDefault(); $$('#df .err').forEach(x => x.textContent = '');
    const v = id => $('#' + id).value.trim(), E = {}, pl = placeById(v('dci'));
    if (!ph[0]) E.dph = 'Add the main photo';
    if (v('dnm').length < 2) E.dnm = 'Enter the destination name';
    if (!v('dst')) E.dst = 'Choose a state';
    if (!pl) E.dci = 'Choose a district';
    if (v('dtw').length < 2) E.dtw = 'Enter the town'; else if (v('dtw').length > 60) E.dtw = 'Max 60 characters';
    if (v('dsr').length < 2) E.dsr = 'Enter the street'; else if (v('dsr').length > 100) E.dsr = 'Max 100 characters';
    if (v('dlm') && (v('dlm').length < 2 || v('dlm').length > 80)) E.dlm = 'Use 2 to 80 characters';
    if (!MAPS_OK.test(v('dmp'))) E.dmp = 'Paste a Google Maps link (google.com/maps or maps.app.goo.gl)';
    if (DV.get().some(x => !videoEmbed(x))) E.dvd = 'Use a full YouTube, Instagram (post/reel) or Facebook video link';
    const isNew = v('dty') === NEWTYPE, tname = isNew ? v('dtn').replace(/\s+/g, ' ') : v('dty');
    if (!v('dty')) E.dty = 'Choose a type';
    else if (isNew && (tname.length < 2 || tname.length > 40)) E.dtn = 'Type name must be 2 to 40 characters';
    if (Object.keys(E).length) { for (const k in E) $('#e_' + k).textContent = E[k]; return; }
    if ($('#dhp').value) return destThanks();                      // honeypot: bots fill hidden fields
    if (!API.ready()) return toast('Supabase is not configured (js/config.js)');
    const b = $('#dgo'); b.disabled = true; b.textContent = 'Sending…';
    try {
      const loc = `${v('dsr')}, ${v('dtw')}` + (v('dlm') ? ` (near ${v('dlm')})` : '');
      await API.submitDestination({ name: v('dnm'), place_id: pl.id, state: pl.state, city: pl.city, type: tname, location: loc, town: v('dtw'), street: v('dsr'), landmark: v('dlm'),
        maps_link: v('dmp'), video_url: DV.get()[0] || '', videos: DV.get(), description: v('dde'), photos: ph.filter(Boolean) });
      destThanks();
    } catch (err) { b.disabled = false; b.textContent = 'Submit destination'; toast(err.message || 'Could not send. Please try again.'); }
  };
}

function destThanks() {
  modal('Thank you!', `<div style="text-align:center;padding:10px 0 4px"><p style="font-size:1.1rem;font-weight:600;margin-bottom:8px">Your destination has been submitted.</p><p class="sub">Our team will review it. Once an admin approves it, it will appear in Popular destinations for everyone.</p><div class="row" style="justify-content:center;margin-top:18px"><button class="btn g" onclick="dlg.close()">Done</button></div></div>`);
}
