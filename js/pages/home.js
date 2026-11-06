/* ===== Home ===== */
function rHome(){const L=curLoc(),inL=x=>!L||x.place_id===L.id,at=L?' in '+esc(L.city):'',stays=all().filter(inL).sort((a,b)=>nearCmp(a,b)||b.rating-a.rating),acts=allActs().filter(inL).sort((a,b)=>nearCmp(a,b)||b.rating-a.rating),pickS=(()=>{const f=stays.filter(x=>x.feat);return f.length?f:stays.slice(0,8)})(),pickA=(()=>{const f=acts.filter(x=>x.feat);return f.length?f:acts.slice(0,8)})(),none=t=>`<div class="empty" style="flex:1 0 100%">${t}</div>`;
$('#home').innerHTML=`<section class="htop"><div class="wrap"><p class="hi1">Hi${S.profile.name?', '+esc(S.profile.name.split(' ')[0]):''}! \ud83d\udc4b</p><h1 class="hi2">Find your perfect escape</h1></div></section>
<div class="sbar"><div class="wrap sbw"><form class="hsr" id="hsr">${SRCH}<input id="hq" placeholder="Search resort, place or activity" enterkeyhint="search" autocomplete="off"><span class="vr"></span><button type="button" class="hfl" aria-label="Filters" aria-expanded="false">${FLTR}</button></form>
<div class="hfp" id="hfp" hidden><p class="hlb">Show</p><div class="hch" data-k="show">${[['all','All'],['res','Resorts'],['act','Activities']].map(([v,l])=>`<button type="button" data-v="${v}" class="${HQ.show===v?'on':''}">${l}</button>`).join('')}</div>
<div id="hfx">${hfBody()}</div>
<button type="button" class="btn o sm" id="hreset" style="margin-top:14px">Reset filters</button></div></div></div>
<section class="htop htop2"><div class="wrap"><div id="hres" hidden></div>
<div class="tl"><button class="tile on" onclick="go('resorts')"><svg viewBox="0 0 24 24"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg><span>Explore Resorts</span></button><button class="tile" onclick="go('activities')"><svg viewBox="0 0 24 24"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2M13 11v2M13 17v2"/></svg><span>Explore Activities</span></button></div>
${heroHtml(L,stays)}</div></section>
<section class="hsec"><div class="wrap"><h2>Stays${at}</h2><div class="grid hs">${pickS.length?pickS.map(card).join(''):none('No stays here yet.')}</div></div></section>
<section class="hsec" style="padding-top:0"><div class="wrap"><div class="sech"><h2>Popular destinations</h2><div class="sechr"><button class="plus" aria-label="Add a destination" title="Add a destination" onclick="destForm()"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></button><button class="vall-btn" onclick="destViewAll()">View all</button></div></div><div id="dsec">${dsecHtml()}</div></div></section>
<section class="hsec" style="padding-top:0"><div class="wrap"><h2>Activities${at}</h2><div class="grid hs">${pickA.length?pickA.map(actCard).join(''):none('No activities here yet.')}</div></div></section>
<section class="hsec" style="padding-top:0"><div class="wrap"><div class="sech"><h2>Best resorts${at}</h2><div class="sechr"><button class="vall-btn" onclick="resViewAll()">View all</button></div></div><div class="hcs" id="hcs">${hostCards(stays,none)}</div></div></section>
<section class="hsec" style="padding-top:0"><div class="wrap"><div class="sech"><h2 id="ptl">${progTitle()}</h2><div class="sechr"><button class="plus" aria-label="Add a program" title="Add a program" onclick="progForm()"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></button><button class="vall-btn" onclick="progViewAll()">View all</button></div></div><div id="psec">${psecHtml()}</div></div></section>`;
adStart();hBind()}

/* ===== Home: "Best resorts" profile cards (host photo, name and place; tap opens that resort's rooms page) ===== */
const PIN='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>';
/* the 10 resorts of a district shown first: the ones the admin chose (Admin > All resorts); otherwise the top rated, one per host */
function bestPick(stays){const seen=new Set(),pick=stays.filter(r=>r.best).sort((a,b)=>b.rating-a.rating);return pick.length?pick.slice(0,10):[...stays].sort((a,b)=>b.rating-a.rating).filter(r=>{const k=r.owner||r.id;if(seen.has(k))return false;seen.add(k);return true}).slice(0,10)}
function hostCards(stays,none){const best=bestPick(stays);
if(!best.length)return none('No resorts here yet.');
return best.map(hostCard).join('')}
function hostCard(r){const h=(S.hosts||[]).find(x=>x.owner_id===r.owner)||{},name=h.name||r.name,place=h.loc||[r.city,r.state].filter(Boolean).join(', '),av=h.avatar&&safeUrl(h.avatar),bg=av?`url("${esc(av)}")`:DEMO_AV;
return `<article class="hc" role="link" tabindex="0" aria-label="${esc(name)}, view resort" onclick="hostGo('${r.id}')" onkeydown="if(event.key==='Enter')hostGo('${r.id}')"><div class="hcp" style='background-image:${bg}'></div><div class="hct"><b>${esc(name)}</b><span class="hcl">${PIN}${esc(place)}</span></div><div class="hcb"><div class="hcm"><i class="hca" style='background-image:${cover(r)}'></i><div><b>${esc(r.name)}</b><small>\u2605 ${r.rating.toFixed(1)} \u00b7 from ${money(r.price)}</small></div></div><span class="hcn">View resort</span></div></article>`}
/* View all: a separate page listing every resort published in the chosen district (best rated first). Back returns to Home. */
function resViewAll(){go('allres')}
function rAllRes(){const L=curLoc(),list=all().filter(x=>!L||x.place_id===L.id),n=list.length,top=bestPick(list),ids=new Set(top.map(r=>r.id)),seenO=new Set(top.map(r=>r.owner||r.id)),lk=r=>(typeof dsoc==='function'?dsoc(r.id).likes:0)||0,rest=list.filter(r=>!ids.has(r.id)).sort((a,b)=>lk(b)-lk(a)||b.rating-a.rating);
const rest2=rest.filter(r=>{const k=r.owner||r.id;if(seenO.has(k))return false;seenO.add(k);return true});
$('#allres').innerHTML=`<section style="padding-top:100px"><div class="wrap"><div class="vahd"><button class="btn o sm" onclick="goBack('home')">\u2190 Back</button><div class="vat"><h1>All resorts</h1><div class="sub">${n} resort${n===1?'':'s'}${L?' in '+esc(L.city):''}</div></div></div>
${n?`${top.length?`<h3 class="hrt">Best resorts</h3><div class="hcs hcw">${top.map(hostCard).join('')}</div>`:''}${rest2.length?`<h3 class="hrt" style="margin-top:22px">More resorts <span class="sub">\u00b7 most liked first</span></h3><div class="hcs hcw">${rest2.map(hostCard).join('')}</div>`:''}`:'<div class="grid hg"><div class="empty" style="grid-column:1/-1"><h3>No resorts here yet</h3><p>Pick another location from the header.</p></div></div>'}</div></section>`}
let Q=QDEF();
function searchFor(q,a='',b='',g=2){Q={...Q,q,in:a,out:b,g:+g};go('resorts')}
/* ===== Home top cards: admin hero cards for the chosen district (all districts when none is chosen); falls back to top stays ===== */
function heroOpen(id){const h=(S.hero||[]).find(x=>x.id===id);if(!h)return;
if(h.listing_id){if(allActs().some(a=>a.id===h.listing_id))return aDetail(h.listing_id);if(all().some(r=>r.id===h.listing_id))return detail(h.listing_id)}
if(h.place_id)districtGo(h.place_id)}
/* district cards first, then the cards the admin made for ALL districts (place_id null) */
function heroHtml(L,stays){const H=(S.hero||[]).filter(h=>!L||!h.place_id||h.place_id===L.id).sort((a,b)=>(!a.place_id)-(!b.place_id)),dots=n=>`<div class="adots">${Array.from({length:n},(_,i)=>`<i class="${i?'':'on'}"></i>`).join('')}</div>`;
if(H.length){const pl=h=>h.place_id?placeById(h.place_id):null;return `<div class="ads" id="ads">${H.map(h=>`<article class="ad" onclick="heroOpen('${h.id}')" style="background-image:url('${esc(h.photo)}')">${h.tag?`<span class="adt">${esc(h.tag)}</span>`:''}<div class="adb"><div><b>${esc(h.title)}</b><span>${esc(h.subtitle||(pl(h)?pl(h).city+', '+pl(h).state:''))}</span></div></div></article>`).join('')}</div>${dots(H.length)}`}
const at=L?' in '+esc(L.city):'';
return stays.length?`<div class="ads" id="ads">${stays.slice(0,5).map((r,i)=>`<article class="ad" onclick="detail('${r.id}')" style='background-image:${cover(r)}'><span class="adt">${['Featured','Top rated','Popular','New','New'][i]}</span><div class="adb"><div><b>${esc(r.name)}</b><span>${esc(r.city)}, ${esc(r.state)}</span></div><em>${money(r.price)}</em></div></article>`).join('')}</div>${dots(Math.min(5,stays.length))}`:`<div class="empty">No stays are published${at||' yet'}.${L?' Pick another location from the header.':''}</div>`}
/* ===== Hero slideshow ===== */
let heroT,heroI=0;
function heroStart(){clearInterval(heroT);heroI=0;const sl=$$('.hsl .sl'),dt=$$('.hdots button');
const show=i=>{heroI=i;sl.forEach((x,k)=>x.classList.toggle('on',k===i));dt.forEach((x,k)=>x.classList.toggle('on',k===i))};
const restart=()=>{clearInterval(heroT);heroT=setInterval(()=>{if($('#home').classList.contains('on'))show((heroI+1)%sl.length)},4500)};
dt.forEach((x,k)=>x.onclick=()=>{show(k);restart()});show(0);restart()}
/* ===== Home ad carousel ===== */
let adT,adI=0;
function adStart(){clearInterval(adT);const el=$('#ads');if(!el)return;adI=0;const dots=$$('.adots i'),w=()=>el.clientWidth+12;
el.addEventListener('scroll',()=>{adI=Math.round(el.scrollLeft/w());dots.forEach((d,k)=>d.classList.toggle('on',k===adI))},{passive:true});
const run=()=>{clearInterval(adT);adT=setInterval(()=>{if(!$('#home').classList.contains('on')||!$('#ads'))return;el.scrollTo({left:((adI+1)%dots.length)*w(),behavior:'smooth'})},3500)};
['touchstart','pointerdown'].forEach(e=>el.addEventListener(e,()=>clearInterval(adT),{passive:true}));['touchend','pointerup'].forEach(e=>el.addEventListener(e,run,{passive:true}));run()}
/* ===== Home: search + filters shown on the Home page ===== */
let HQ=HQDEF();
/* Filter panel body changes with "Show": Resorts get resort filters, Activities get activity filters, All gets only the shared ones */
function hfBody(){const s=HQ.show;
return (s==='res'?typeChips('data-k="type"',HQ.type):'')+(s==='act'?catChips('data-k="cat"',HQ.cat):'')+sortSel('hsort')+priceRange('hmx','hpv',HQ.max)+(s==='res'?amenChips('data-k="am"',HQ.am):'')}
function hFilter(){const q=HQ.q.trim().toLowerCase(),active=!!q||HQ.show!=='all'||!!HQ.type||!!HQ.cat||HQ.max<20000||HQ.am.length>0;
$('#home').classList.toggle('hsearch',active);$('#hres').hidden=!active;if(!active)return;
const srt={near:(a,b)=>nearCmp(a,b)||b.pop-a.pop,pop:(a,b)=>b.pop-a.pop,pl:(a,b)=>a.price-b.price,ph:(a,b)=>b.price-a.price,rt:(a,b)=>b.rating-a.rating}[HQ.sort];
const R=HQ.show==='act'?[]:all().filter(r=>(`${r.name} ${r.city} ${r.state} ${r.type}`).toLowerCase().includes(q)&&r.price<=HQ.max&&(HQ.show!=='res'||((!HQ.type||r.type===HQ.type)&&HQ.am.every(a=>r.am.includes(a))))).sort(srt);
const A=HQ.show==='res'?[]:allActs().filter(a=>(`${a.name} ${a.city} ${a.cat}`).toLowerCase().includes(q)&&a.price<=HQ.max&&(HQ.show!=='act'||!HQ.cat||a.cat===HQ.cat)).sort(srt);
const n=R.length+A.length;
$('#hres').innerHTML=`<div class="hrh"><b>${n} result${n==1?'':'s'}</b><button type="button" class="hclr" onclick="HQ=HQDEF();rHome()">Clear</button></div>${R.length?`<h3 class="hrt">Resorts</h3><div class="grid hg">${R.map(card).join('')}</div>`:''}${A.length?`<h3 class="hrt">Activities</h3><div class="grid hg">${A.map(actCard).join('')}</div>`:''}${n?'':'<div class="empty"><h3>No matches</h3><p>Try another word or reset the filters.</p></div>'}`}
function hBindX(){
$$('#hfx .hch').forEach(g=>g.onclick=e=>{const b=e.target.closest('button');if(!b)return;const k=g.dataset.k,v=b.dataset.v;if(k==='am'){HQ.am=HQ.am.includes(v)?HQ.am.filter(x=>x!==v):[...HQ.am,v];b.classList.toggle('on')}else{HQ[k]=v;$$('button',g).forEach(x=>x.classList.toggle('on',x===b))}hFilter()});
const so=$('#hsort');so.value=HQ.sort;so.onchange=()=>{HQ.sort=so.value;hFilter()};
const mx=$('#hmx');rangeFill(mx,HQ.max);mx.oninput=()=>{HQ.max=+mx.value;$('#hpv').textContent=money(HQ.max);rangeFill(mx,HQ.max);hFilter()}}
function hBind(){const q=$('#hq');q.value=HQ.q;q.oninput=e=>{HQ.q=e.target.value;hFilter()};
$('#hsr').onsubmit=e=>{e.preventDefault();q.blur();hFilter()};
const fb=$('.hfl');fb.onclick=toggleFp(fb,$('#hfp'));
$('.hch[data-k="show"]').onclick=e=>{const b=e.target.closest('button');if(!b)return;HQ.show=b.dataset.v;HQ.type='';HQ.cat='';HQ.am=[];$$('.hch[data-k="show"] button').forEach(x=>x.classList.toggle('on',x===b));$('#hfx').innerHTML=hfBody();hBindX();hFilter()};
hBindX();
$('#hreset').onclick=()=>{HQ=HQDEF();rHome()};
hFilter()}
