/* ===== Resorts (same search bar + filter panel as Home) ===== */
function rResorts(){
$('#resorts').innerHTML=`<section class="htop"><div class="wrap"><h2 class="fh">Find <em>your</em> stay</h2><span class="rule"></span></div></section>
<div class="sbar"><div class="wrap sbw"><form class="hsr" id="rsr">${SRCH}<input id="q" placeholder="Search name, city or state" value="${esc(Q.q)}" enterkeyhint="search" autocomplete="off"><span class="vr"></span><button type="button" class="hfl" id="rfl" aria-label="Filters" aria-expanded="false">${FLTR}</button></form>
<div class="hfp" id="rfp" hidden>
${locChips('data-k="loc"',Q.all)}
${typeChips('data-k="type"',Q.type)}
${sortSel('sort')}
${priceRange('mx','pv',Q.max)}
${amenChips('data-k="am"',Q.am)}
<button type="button" class="btn o sm" id="rreset" style="margin-top:14px">Reset filters</button></div></div></div>
<section class="hsec" style="padding-top:14px"><div class="wrap"><div id="rg" class="grid"></div></div></section>`;
$('#sort').value=Q.sort;
rangeFill($('#mx'),Q.max);
$('#rsr').onsubmit=e=>{e.preventDefault();$('#q').blur()};
$('#q').oninput=e=>{Q.q=e.target.value;list()};
$('#rfl').onclick=toggleFp($('#rfl'),$('#rfp'));
$$('#rfp .hch').forEach(g=>g.onclick=e=>{const b=e.target.closest('button');if(!b)return;const v=b.dataset.v;
 if(g.dataset.k==='am'){Q.am=Q.am.includes(v)?Q.am.filter(x=>x!==v):[...Q.am,v];b.classList.toggle('on')}
 else if(g.dataset.k==='loc'){Q.all=v==='all';$$('button',g).forEach(x=>x.classList.toggle('on',x===b))}
 else{Q.type=v;$$('button',g).forEach(x=>x.classList.toggle('on',x===b))}list()});
$('#sort').onchange=e=>{Q.sort=e.target.value;list()};
$('#mx').oninput=e=>{Q.max=+e.target.value;$('#pv').textContent=money(Q.max);rangeFill($('#mx'),Q.max);list()};
$('#rreset').onclick=()=>{Q=QDEF();rResorts()};
list()}
function list(){let L=all().filter(r=>(`${r.name} ${r.city} ${r.state}`).toLowerCase().includes(Q.q.toLowerCase())&&r.price<=Q.max&&r.rating>=Q.rating&&(Q.all||inLoc(r))&&(!Q.type||r.type===Q.type)&&Q.am.every(a=>r.am.includes(a)));
const k={near:(a,b)=>nearCmp(a,b)||b.pop-a.pop||b.rating-a.rating,pop:(a,b)=>b.pop-a.pop,pl:(a,b)=>a.price-b.price,ph:(a,b)=>b.price-a.price,rt:(a,b)=>b.rating-a.rating}[Q.sort];L.sort(k);
const g=$('#rg');if(g)g.innerHTML=L.length?L.map(card).join(''):`<div class="empty" style="grid-column:1/-1"><h3>No stays match yet</h3><p>Try a higher price limit or remove an amenity filter.</p><button class="btn g sm" style="margin-top:12px" onclick="Q=QDEF();rResorts()">Clear filters</button></div>`}
/* ===== Detail ===== */
