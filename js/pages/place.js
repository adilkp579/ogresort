/* Place page: a district page (from a district card) or a destination page (from a destination card).
   Main photo, other photos to swap it, description, Google Maps button, video, then the cards.
   Cards are two columns, also on phones: Stays (rooms) on the left, Activities on the right. */
let PLC = { title: '', sub: '', type: '', photos: [], desc: '', location: '', link: '', video: '', placeId: '', district: null }, PLG = [], PLI = 0;
const bgUrl = u => `url("${esc(u)}")`;

function districtGo(id) {
  const p = placeById(id); if (!p) return;
  PLC = { title: p.city, sub: p.state, type: '', desc: p.description || '', location: '', link: p.maps_link || '', video: p.video_url || '', videos: p.video_url ? [p.video_url] : [], placeId: p.id, state: '', district: p,
    photos: p.photos && p.photos.length ? p.photos.map(bgUrl) : [scene('#163D32', '#C5A46D', 4, 'forest')] };
  go('place');
}
function stateGo(st) {
  const ps = S.places.filter(p => p.state === st), ph = statePhotos(st), sr = stateRow(st);
  PLC = { title: st, sub: ps.length + ' district' + (ps.length === 1 ? '' : 's'), type: '', desc: (sr && sr.description) || '', location: '', link: '', video: '', videos: [], placeId: '', state: st, district: null,
    photos: ph.length ? ph.slice(0, 3).map(bgUrl) : [scene('#163D32', '#C5A46D', 4, 'forest')] };
  go('place');
}
function placeGoDest(id) {
  const d = S.dests.find(x => x.id === id); if (!d) return;
  const pl = d.place_id ? placeById(d.place_id) : S.places.find(p => p.city.toLowerCase() === d.city.toLowerCase() && p.state.toLowerCase() === d.state.toLowerCase());
  PLC = { title: d.name || d.city, sub: `${d.city}, ${d.state}`, type: d.type, desc: d.desc, location: d.location, town: d.town, street: d.street, landmark: d.landmark, link: d.link, video: d.video, videos: d.videos || [], destId: d.id, placeId: pl ? pl.id : '', state: '', district: null,
    photos: d.photos.map(bgUrl) };
  go('place');
}
function plSet(i) {
  const m = $('#plm'), it = PLG[i]; if (!m || !it) return;
  $$('.pplts .pt').forEach((b, k) => b.classList.toggle('on', k === i)); PLI = i;
  const old = m.querySelector('iframe'); if (old) old.remove();
  if (typeof it === 'string') { m.classList.remove('vid'); m.removeAttribute('data-k'); m.style.backgroundImage = it; }
  else { m.classList.add('vid'); m.dataset.k = it.kind; m.style.backgroundImage = 'none'; m.insertAdjacentHTML('afterbegin', vFrame(it)); }
  const t = $$('.pplts .pt')[i]; if (t && t.scrollIntoView) try { t.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) {}
}

/* Video: YouTube plays inline; Instagram / Facebook open in a new tab (they block normal embedding) */
const ytId = u => { const m = (u || '').match(/^https:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/i); return m ? m[1] : ''; };
function videoBlock(u) {
  const v = videoEmbed(u);
  if (v) return `<div class="pvid ${v.kind}">${vFrame(v, 'Destination video')}</div>`;
  return `<a class="btn o sm" style="text-decoration:none;display:inline-block" href="${esc(safeUrl(u))}" target="_blank" rel="noopener noreferrer">\u25b6 Watch video</a>`;
}

function rPlace() {
  if (!PLC.title) return go('home');
  const hit = x => PLC.placeId ? x.place_id === PLC.placeId : !!PLC.state && (placeById(x.place_id) || {}).state === PLC.state;
  /* the destination's own town first, then the visitor's town / district, then nearer districts */
  const rel = x => (PLC.town && sameTown(PLC.town, x.town) ? 0 : 1), byNear = (a, b) => rel(a) - rel(b) || nearCmp(a, b) || b.rating - a.rating;
  const stays = all().filter(hit).sort(byNear);
  const acts = allActs().filter(hit).sort(byNear);
  const vemb = (PLC.videos || []).map(videoEmbed), vlinks = (PLC.videos || []).filter((u, k) => !vemb[k]);
  PLG = [...PLC.photos, ...vemb.filter(Boolean)]; PLI = 0;
  const col = (h, L, fn, none) => `<div class="pcol"><h3 class="pch">${h} <span class="sub">${L.length}</span></h3><div class="pcards">${L.length ? L.map(fn).join('') : `<div class="empty">${none}</div>`}</div></div>`;
  $('#place').innerHTML = `<section style="padding-top:100px"><div class="wrap"><button class="btn o sm" style="margin-left:4px" onclick="goBack('home')">\u2190 Back</button>
<div class="phero" id="plm" style='background-image:${PLC.photos[0]}'><div class="phb">${PLC.type ? `<span class="tag">${esc(PLC.type)}</span>` : ''}<h1>${esc(PLC.title)}</h1><div class="sub">${esc(PLC.sub)} · ${stays.length} stay${stays.length === 1 ? '' : 's'} · ${acts.length} activit${acts.length === 1 ? 'y' : 'ies'}</div></div></div>
${PLG.length > 1 ? `<div class="pts pplts">${PLG.map((x, i) => typeof x === 'string' ? `<button class="pt${i ? '' : ' on'}" aria-label="Photo ${i + 1}" onclick="plSet(${i})" style='background-image:${x}'></button>` : `<button class="pt pv" aria-label="Play ${x.label} video" onclick="plSet(${i})"><i>\u25b6</i><small>${x.label}</small></button>`).join('')}</div>` : ''}
${PLC.destId ? socBar(PLC.destId) : ''}
${PLC.desc ? `<p style="margin:16px 4px 0">${esc(PLC.desc)}</p>` : ''}
${PLC.town ? `<div class="sum"><div><span>Town</span><span>${esc(PLC.town)}</span></div><div><span>Street</span><span style="text-align:right">${esc(PLC.street)}</span></div>${PLC.landmark ? `<div><span>Landmark</span><span style="text-align:right">${esc(PLC.landmark)}</span></div>` : ''}</div>` : PLC.location ? `<div class="sum"><div><span>Location</span><span style="text-align:right">${esc(PLC.location)}</span></div></div>` : ''}
<div class="row" style="margin-left:4px">${PLC.link && safeUrl(PLC.link) ? `<a class="btn g sm" style="text-decoration:none;display:inline-block" href="${esc(safeUrl(PLC.link))}" target="_blank" rel="noopener noreferrer">Open in Google Maps</a>` : ''}${PLC.district ? `<button class="btn o sm" onclick="locSet('${PLC.district.id}')">Set as my location</button>` : ''}</div>
${vlinks.length ? `<div class="row" style="margin:14px 4px 0">${vlinks.filter(safeUrl).map((u, k) => `<a class="btn o sm" style="text-decoration:none;display:inline-block" href="${esc(safeUrl(u))}" target="_blank" rel="noopener noreferrer">\u25b6 Watch video ${k + 1}</a>`).join('')}</div>` : ''}
${famHtml()}
<div class="pcols">${col('Stays', stays, card, 'No stays here yet.')}${col('Activities', acts, actCard, 'No activities here yet.')}</div></div></section>`;
  const m = $('#plm'); let x0 = null;                      // swipe the main photo on touch screens
  m.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
  m.addEventListener('touchend', e => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 40 && PLG.length > 1) plSet((PLI + (dx < 0 ? 1 : PLG.length - 1)) % PLG.length); }, { passive: true });
}
