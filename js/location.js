/* Location: "live" (GPS -> nearest admin-added district) or a district the visitor picks manually.
   The whole site (home, stays, activities, popular destinations) works for the selected district. */
let LIVETOWNS = [], LIVE = null, LIVEXY = null, DET = null, locMsg = 'Detecting\u2026';   // DET = district found from GPS that has no admin-added place yet
const LIVE_RADIUS_KM = 150;       // farther than this from every district: ask the visitor to choose

const hav = (a, b) => { const t = x => x * Math.PI / 180, dl = t(b[0] - a[0]), dg = t(b[1] - a[1]), q = Math.sin(dl / 2) ** 2 + Math.cos(t(a[0])) * Math.cos(t(b[0])) * Math.sin(dg / 2) ** 2; return 12742 * Math.asin(Math.sqrt(q)); };
const placeById = id => S.places.find(p => p.id === id);
const coordOf = p => (p && p.lat != null && p.lng != null ? [+p.lat, +p.lng] : null);
const curLoc = () => (S.locMode === 'manual' ? (placeById(S.locId) || null) : (LIVE ? placeById(LIVE) || null : null));
const inLoc = x => { const L = curLoc(); return !L || x.place_id === L.id; };
const locLabel = () => { const L = curLoc(); return S.locMode !== 'manual' && DET ? DET.name : L ? L.city : locMsg; };

/* Name matching: spelling variants of Kerala districts count as the same place */
const ALIAS = { alleppey: 'alappuzha', cochin: 'kochi', ernakulam: 'kochi', trivandrum: 'thiruvananthapuram', calicut: 'kozhikode', palghat: 'palakkad', trichur: 'thrissur', cannanore: 'kannur', quilon: 'kollam', cottayam: 'kottayam' };
const norm = s => { const k = String(s || '').toLowerCase().replace(/\b(district|city|taluk|municipality|corporation)\b/g, '').replace(/[^a-z]/g, ''); return ALIAS[k] || k; };

/* GPS -> district name (free reverse-geocoding, no key). Returns { names:[best first], state } or null */
async function geoName(lat, lng) {
  try {
    const ac = new AbortController(), t = setTimeout(() => ac.abort(), 3000);
    const r = await fetch('https://api.bigdatacloud.net/data/reverse-geocode-client?localityLanguage=en&latitude=' + lat + '&longitude=' + lng, { signal: ac.signal });
    clearTimeout(t); if (!r.ok) return null;
    const j = await r.json(), adm = (j.localityInfo && j.localityInfo.administrative) || [];
    const dd = adm.find(a => /district/i.test(a.name || ''));
    const names = [dd && dd.name, j.city, j.locality, ...adm.map(a => a.name)].filter(Boolean);
    const towns = [j.locality, j.city].filter(Boolean);                  // the visitor's own town / locality, for "same town first"
    return names.length ? { names, towns, state: j.principalSubdivision || '' } : null;
  } catch (e) { return null; }
}

/* distance (km) from the selected location to a listing; 0 = same district, null = unknown */
const dist = r => {
  const L = curLoc(); if (!L) return null;
  if (r.place_id && r.place_id === L.id) return 0;
  const a = coordOf(L) || LIVEXY, b = coordOf(placeById(r.place_id));
  return a && b ? hav(a, b) : null;
};
/* PROXIMITY ORDER used by every list (stays, activities, destinations):
   1) same TOWN as the visitor (live GPS only: the town comes from the reverse-geocode)   -> rank -2
   2) same DISTRICT                                                                       -> rank -1
   3) other districts, nearest first by distance between district centres                 -> rank = km
   4) unknown distance (no location / no coordinates) goes last                           -> rank 1e9 */
const sameTown = (a, b) => { a = norm(a); b = norm(b); return a.length > 2 && b.length > 2 && (a === b || a.includes(b) || b.includes(a)); };
const townHit = x => { const L = curLoc(); return !!(L && S.locMode !== 'manual' && x.place_id === L.id && x.town && LIVETOWNS.some(t => sameTown(t, x.town))); };
const proxRank = x => { if (townHit(x)) return -2; const d = dist(x); return d == null ? 1e9 : d === 0 ? -1 : d; };
const nearCmp = (a, b) => proxRank(a) - proxRank(b);
const kmTxt = r => { if (townHit(r)) return 'In your town'; const d = dist(r); return d == null ? '' : d < 20 ? 'In your area' : Math.round(d) + ' km away'; };

let locResolve = null; const locSettled = () => { if (locResolve) { locResolve(); locResolve = null; } };
function refreshLoc() { locSettled(); HST = ''; badge(); const pg = $('.page.on').id; if (['home', 'resorts', 'activities'].includes(pg)) go(pg); }
function locFail(msg, manual) {
  locSettled(); LIVE = null; DET = null; locMsg = 'Choose location'; badge(); if (manual) toast(msg);
  /* first visit and detection failed: ask the visitor to pick a district once */
  if (!manual && S.locMode !== 'manual' && S.places.length) { try { if (sessionStorage.getItem('vdLocAsked')) return; sessionStorage.setItem('vdLocAsked', '1'); } catch (e) {} setTimeout(() => { if (!dlg.open) locPicker(); }, 500); }
}

/* GPS fix + reverse-geocode in one step. Resolves { here, g } or null (denied / unavailable). It needs no admin data, so it can start before the districts have loaded. */
const locFix = () => new Promise(res => navigator.geolocation.getCurrentPosition(
  async p => { const here = [p.coords.latitude, p.coords.longitude]; LIVEXY = here; const g = await geoName(here[0], here[1]); LIVETOWNS = g ? g.towns.map(norm).filter(n => n.length > 2) : []; res({ here, g }); },
  () => res(null), { timeout: 8000, maximumAge: 600000 }));
/* started the moment the page opens (app.js), in parallel with loading the districts */
let LOCPRE = null;
const locPrefetch = () => { if (navigator.geolocation) LOCPRE = locFix(); };

function autoLoc(manual) {
  const pr = new Promise(r => { locResolve = r; });
  if (!navigator.geolocation) { locFail('Location is not available on this device', manual); return pr; }
  locMsg = 'Detecting\u2026'; badge();
  const src = (!manual && LOCPRE) || locFix(); LOCPRE = null;
  src.then(fix => {
    if (!fix) return locFail('Allow location access, or choose a district', manual);
    const { here, g } = fix;
    /* 1) the district GPS says we are in, if the admin has added it */
    let best = null;
    if (g) for (const n of g.names) { best = S.places.find(pl => norm(pl.city) === norm(n)); if (best) break; }
    /* 2) otherwise the nearest admin-added district that has map coordinates */
    if (!best) {
      let bd = 1e9, near = null;
      S.places.forEach(pl => { const c = coordOf(pl); if (!c) return; const d = hav(here, c); if (d < bd) { bd = d; near = pl; } });
      if (near && bd <= LIVE_RADIUS_KM) best = near;
    }
    if (best) { const exact = g && g.names.some(n => norm(n) === norm(best.city)); LIVE = best.id; DET = g ? (exact ? { name: best.city, state: best.state } : { name: String(g.names[0]).replace(/\s+district$/i, ''), state: g.state }) : null; S.locMode = 'live'; save(); refreshLoc(); if (manual) toast('Live location: ' + best.city); return; }
    /* 3) we know the district but no stays are listed there yet */
    if (g) { const nm = String(g.names[0]).replace(/\s+district$/i, ''); LIVE = null; DET = { name: nm, state: g.state }; S.locMode = 'live'; save(); refreshLoc(); toast('No stays added in ' + nm + ' yet. Showing all districts.'); return; }
    locFail(S.places.some(coordOf) ? 'You are not near any available district. Choose one manually.' : 'Could not find your district. Choose one manually.', manual);
  });
  return pr;
}

function locSet(id) {
  const p = placeById(id); if (!p) return;
  S.locMode = 'manual'; S.locId = id; save();
  if (dlg.open) dlg.close();
  refreshLoc(); toast('Location: ' + p.city);
}

/* Header location button: two-pane glass picker. Left = states, right = districts of the selected state only.
   Opens on the state of the current / detected location. */
let LPST = '';
const lpStates = () => [...new Set(S.places.map(p => p.state))].sort((a, b) => a.localeCompare(b));
function locPicker() {
  const cur = curLoc(), manual = S.locMode === 'manual', live = !manual && (cur || DET), st = lpStates();
  const now = live ? (DET ? DET.name : cur.city) : cur ? cur.city : '';
  const want = (cur && cur.state) || (DET && DET.state) || '';
  LPST = st.find(x => x.toLowerCase() === String(want).toLowerCase()) || st[0] || '';
  modal('Choose location', `<div class="lp-top">${now ? `<p class="lp-now"><span>${live ? '\ud83d\udccd Detected' : 'Selected'}</span><b>${esc(now)}</b>${cur ? `<em>${esc(cur.state)}</em>` : DET && DET.state ? `<em>${esc(DET.state)}</em>` : ''}</p>` : '<p class="lp-now"><span>Pick your state, then your district</span></p>'}
<button class="lp-live" onclick="dlg.close();autoLoc(true)"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="8"/></svg>${live ? 'Detect again' : 'Use my live location'}</button></div>
${st.length ? `<div class="lp"><div class="lp-s" id="lps" role="tablist" aria-label="States"></div><div class="lp-d"><p class="lp-h" id="lph"></p><input id="lq" type="search" placeholder="Search district" autocomplete="off" aria-label="Search district" oninput="locFilter(this.value)"><div id="lpd"></div></div></div>` : '<div class="empty"><p>No districts have been added yet.</p></div>'}`);
  dlg.classList.add('glass', 'lpk');
  if (st.length) lpPaint();
}
function lpPaint() {
  const st = lpStates(), cur = curLoc(), manual = S.locMode === 'manual';
  $('#lps').innerHTML = st.map((x, i) => { const n = S.places.filter(p => p.state === x).length; return `<button type="button" role="tab" aria-selected="${x === LPST}" class="${x === LPST ? 'on' : ''}" onclick="lpState(${i})"><span>${esc(x)}</span><small>${n}</small></button>`; }).join('');
  const D = S.places.filter(p => p.state === LPST).sort((a, b) => a.city.localeCompare(b.city)), liveId = S.locMode !== 'manual' && LIVE;
  $('#lph').textContent = `Districts in ${LPST}`;
  $('#lpd').innerHTML = D.map(p => { const on = cur && cur.id === p.id; return `<button type="button" data-c="${esc(p.city.toLowerCase())}" class="${on ? 'on' : ''}" onclick="locSet('${p.id}')"><span>${esc(p.city)}</span>${liveId === p.id ? '<em>Live</em>' : ''}${on ? '<svg viewBox="0 0 24 24"><path d="M5 12l5 5L20 7"/></svg>' : ''}</button>`; }).join('');
  const q = $('#lq'); if (q) { q.value = ''; }
}
function lpState(i) { LPST = lpStates()[i]; lpPaint(); const d = $('#lpd'); if (d) d.scrollTop = 0; }
function locFilter(v) {
  v = v.trim().toLowerCase(); let n = 0;
  $$('#lpd button').forEach(b => { const ok = !v || b.dataset.c.includes(v); b.hidden = !ok; if (ok) n++; });
  let e = $('#lpe'); if (!n) { if (!e) { e = document.createElement('p'); e.id = 'lpe'; e.className = 'lp-e'; e.textContent = 'No district found'; $('#lpd').after(e); } } else if (e) e.remove();
}
