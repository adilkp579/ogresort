/* ===== Resort (host) page: opened from a Best resorts card =====
   Welcome title, a cover photo, then every published card that account listed. A card opens only when tapped. */
/* demo photos used when the account has not added its own profile photo / cover photo */
const svgUrl=s=>`url("data:image/svg+xml,${encodeURIComponent(s).replace(/'/g,'%27')}")`;
const DEMO_AV=svgUrl(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><rect width='200' height='200' fill='#dfe9e3'/><circle cx='100' cy='78' r='34' fill='#163D32'/><path d='M34 190c6-44 38-62 66-62s60 18 66 62z' fill='#163D32'/></svg>`);
const DEMO_COV=svgUrl(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 450'><defs><linearGradient id='g' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#f4e9d0'/><stop offset='1' stop-color='#dfe9e3'/></linearGradient></defs><rect width='800' height='450' fill='url(#g)'/><circle cx='620' cy='110' r='44' fill='#C5A46D'/><path d='M0 330l150-130 130 100 150-150 170 160 200-120v260H0z' fill='#2c6b57'/><path d='M0 390l180-80 170 60 200-90 250 100v70H0z' fill='#163D32'/></svg>`);
let HC={owner:'',rid:''};
function hostGo(id){const r=find(id);if(!r)return;HC={owner:r.owner||'',rid:id};go('host')}
function rHost(){const r=find(HC.rid);if(!r)return go('home');
const h=(S.hosts||[]).find(x=>x.owner_id===HC.owner)||{},name=h.name||r.name,own=x=>HC.owner?x.owner===HC.owner:x.id===r.id,
hc=h.cover&&safeUrl(h.cover)?`url("${esc(h.cover)}")`:DEMO_COV,lk=(h.maps_link&&safeUrl(h.maps_link)?`<a class="btn o sm" href="${esc(h.maps_link)}" target="_blank" rel="noopener noreferrer">Google Maps</a>`:'')+(/^\d{10,15}$/.test(h.whatsapp||'')?`<a class="btn g sm" href="https://wa.me/${h.whatsapp}" target="_blank" rel="noopener noreferrer">WhatsApp</a>`:''),stays=all().filter(own),acts=allActs().filter(x=>HC.owner&&x.owner===HC.owner),n=stays.length+acts.length;
$('#host').innerHTML=`<section style="padding-top:100px"><div class="wrap"><div class="vahd"><button class="btn o sm" onclick="goBack('home')">\u2190 Back</button></div>
<h1 class="hwel">Welcome to ${esc(name)}</h1>
<div class="hcov" style='background-image:${hc}'></div>
${lk?`<div class="hlk">${lk}</div>`:''}
${stays.length?`<h3 class="hrt">Rooms &amp; stays</h3><div class="grid hg">${stays.map(card).join('')}</div>`:''}
${acts.length?`<h3 class="hrt" style="margin-top:22px">Activities</h3><div class="grid hg">${acts.map(actCard).join('')}</div>`:''}
${n?'':'<div class="empty"><p>No cards listed yet.</p></div>'}</div></section>`}
