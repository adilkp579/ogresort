/* ===== Activities & tickets ===== */
let ACAT=['Water','Nature','Culture','Wellness','Adventure'];
let AC=ACDEF();
const allActs=()=>S.prods.filter(p=>p.status==='Published');
const actOf=id=>S.prods.find(a=>a.id===id);
const NOACT={name:'Removed activity',city:'',img:'none'};
const actImg=a=>IMGS[a.id]&&IMGS[a.id][0]?`url("${IMGS[a.id][0]}")`:a.img;
/* Activities page: same search bar + filter panel as Home */
function rActs(){$('#activities').innerHTML=`<section class="htop"><div class="wrap"><h2>Activities & tickets</h2></div></section>
<div class="sbar"><div class="wrap sbw"><form class="hsr" id="asr">${SRCH}<input id="aq" placeholder="Search activity or destination" value="${esc(AC.q)}" enterkeyhint="search" autocomplete="off"><span class="vr"></span><button type="button" class="hfl" id="afl" aria-label="Filters" aria-expanded="false">${FLTR}</button></form>
<div class="hfp" id="afp" hidden>${locChips('id="alc"',AC.all)}
<p class="hlb">Category</p><div class="hch" id="ach">${['',...ACAT].map(c=>`<button type="button" data-v="${c}" class="${c===AC.cat?'on':''}">${c||'All'}</button>`).join('')}</div>
${priceRange('amx','apv',AC.max)}
<button type="button" class="btn o sm" id="areset" style="margin-top:14px">Reset filters</button></div></div></div>
<section class="hsec" style="padding-top:14px"><div class="wrap"><div id="ag" class="grid"></div></div></section>`;
rangeFill($('#amx'),AC.max);
$('#asr').onsubmit=e=>{e.preventDefault();$('#aq').blur()};
$('#aq').oninput=e=>{AC.q=e.target.value;actList()};
$('#afl').onclick=toggleFp($('#afl'),$('#afp'));
$('#ach').onclick=e=>{const b=e.target.closest('button');if(!b)return;AC.cat=b.dataset.v;$$('#ach button').forEach(x=>x.classList.toggle('on',x===b));actList()};
$('#alc').onclick=e=>{const b=e.target.closest('button');if(!b)return;AC.all=b.dataset.v==='all';$$('#alc button').forEach(x=>x.classList.toggle('on',x===b));actList()};
$('#amx').oninput=e=>{AC.max=+e.target.value;$('#apv').textContent=money(AC.max);rangeFill($('#amx'),AC.max);actList()};
$('#areset').onclick=()=>{AC=ACDEF();rActs()};
actList()}
function actCard(a){return lcard(a,'aDetail',actImg(a),esc(a.city),'ticket')}
function actList(){const L=allActs().filter(a=>(a.name+' '+a.city).toLowerCase().includes(AC.q.toLowerCase())&&(!AC.cat||a.cat===AC.cat)&&a.price<=AC.max&&(AC.all||inLoc(a))).sort((a,b)=>nearCmp(a,b)||(b.pop||0)-(a.pop||0)||b.rating-a.rating);
$('#ag').innerHTML=L.length?L.map(actCard).join(''):'<div class="empty" style="grid-column:1/-1"><h3>No activities found</h3><p>Try another destination or reset the filters.</p></div>'}
function tForm(id){const a=actOf(id),types=typesOf(a,'act'),slots=['9:00 AM','1:00 PM','4:30 PM'];
modal('Book tickets \u2014 '+esc(a.name),`<form id="tf" novalidate><div class="two"><div><label>Date<input type="date" id="td" min="${today()}"></label><div class="err" id="e_td"></div></div><div><label>Time slot<select id="ts">${slots.map(x=>`<option>${x}</option>`).join('')}</select></label></div><div><label>Name<input id="tn" value="${esc(S.profile.name)}"></label><div class="err" id="e_tn"></div></div>${contactHtml('t',S.profile.phone,S.profile.wa)}</div>
<p class="sub" style="margin:14px 0 6px"><b>Tickets</b> \u00b7 choose how many of each type</p><div class="sum" style="margin:0">${types.map((t,i)=>`<div><span><b>${esc(t.name)}</b> <span class="sub">${money(t.price)}</span></span><input type="number" id="tq${i}" min="0" max="20" value="${i==0?1:0}" style="width:80px"></div>`).join('')}</div><div class="err" id="e_tq"></div>
<div class="sum" id="ts2"></div><div class="row"><button class="btn g">Review &amp; confirm</button></div></form>`);
contactBind('t');
const tot=()=>{const items=types.map((t,i)=>({name:t.name,price:t.price,qty:Math.max(0,Math.floor(+$('#tq'+i).value||0))})).filter(x=>x.qty>0),sub=items.reduce((n,x)=>n+x.price*x.qty,0),count=items.reduce((n,x)=>n+x.qty,0);const rule=ruleOf('activity',a.cat),tax=sub*(rule.tax_pct/100);return{items,count,sub,tax,fee:rule.service_fee,rule,total:Math.round(sub+tax+rule.service_fee)}};
const up=()=>{const t=tot();$('#ts2').innerHTML=t.count>0?`${t.items.map(x=>`<div><span>${x.qty} \u00d7 ${esc(x.name)}</span><span>${money(x.price*x.qty)}</span></div>`).join('')}<div><span>Taxes (${t.rule.tax_pct}%)</span><span>${money(t.tax)}</span></div>${t.fee>0?`<div><span>Service fee</span><span>${money(t.fee)}</span></div>`:''}<div><b>Estimated total</b><b class="price">${money(t.total)}</b></div>`:'<span class="sub">Choose at least one ticket.</span>'};
$$('#tf input,#tf select').forEach(i=>i.oninput=up);up();
const AV=availAttach({id:a.id,anchor:$('#td').closest('label').parentElement,inEl:$('#td'),single:true});
$('#tf').onsubmit=e=>{e.preventDefault();$$('#tf .err').forEach(x=>x.textContent='');const E={},t=tot(),d=$('#td').value;
if(!d)E.td='Pick a date';else if(d<today())E.td='Date can\u2019t be in the past';if(t.count<1)E.tq='Choose at least one ticket';else if(t.count>20)E.tq='Up to 20 tickets per booking';
if(!$('#tn').value.trim())E.tn='Enter a name';contactErr('t',E);
if(Object.keys(E).length){for(const k in E)$('#e_'+k).textContent=E[k];return}
if(AV.conflict()){AV.show(true);return}
CK={kind:'ticket',id,d,sl:$('#ts').value,nm:$('#tn').value.trim(),phone:$('#tp').value.trim(),wa:$('#tw').value.trim(),t};dlg.close();go('checkout')}}

function tix(){return S.tickets.length?S.tickets.map(t=>{const a=actOf(t.aid)||NOACT;return `<div class="bk"><div class="im" style='background-image:${a.img}'></div><div class="in"><span class="tag ${bCls(t)}">${bLabel(t)}</span><h3>${esc(a.name)}</h3><div class="sub">${esc(a.city)} · Ref ${esc(t.id)}<br>${esc(t.date)} · ${esc(t.slot)} · ${tkTxt(t)} · ${esc(t.guest)}</div><div class="price" style="margin-top:4px">${money(t.total)}</div><div class="row"><button class="btn g sm" onclick="tkView('act','${t.id}')">View ticket</button>${(t.status=='Upcoming'||t.status=='Pending'||t.status=='AwaitingPayment')?`<button class="btn d sm" onclick="tCancel('${t.id}')">Cancel</button>`:''}</div></div></div>`}).join(''):`<div class="empty"><h3>No tickets yet</h3><p>Book an activity and your tickets will show up here.</p><button class="btn g sm" style="margin-top:12px" onclick="go('activities')">Browse activities</button></div>`}
function tCancel(id){const t=S.tickets.find(x=>x.id===id);if(!t)return;confirmBox(t.status==='AwaitingPayment'?'Release these held tickets?':'Cancel these tickets? Free cancellation up to 24 hours before the activity; after that the amount paid is not refunded.',async()=>{try{if(!t.key)throw new Error('This older booking can\u2019t be cancelled online. Please contact the host.');const r=await API.guestCancel(id,t.key);if(t.status==='AwaitingPayment'){S.tickets=S.tickets.filter(x=>x.id!==id);save();toast('Released');return rBookings(true)}t.status='Cancelled';t.by='guest';save();toast(refundMsg(r,'Tickets cancelled'))}catch(e){return toast(e.message)}rBookings(true)},'Yes, cancel')}
function tPrint(id){const t=S.tickets.find(x=>x.id===id),a=actOf(t.aid)||NOACT,w=open('','_blank');if(!w)return toast('Allow pop-ups to print');w.document.write(`<title>${id}</title><body style="font-family:sans-serif;max-width:560px;margin:40px auto"><h1>Verdane — Activity ticket</h1><h2>${esc(a.name)}</h2><p>Reference: ${esc(id)}<br>${esc(t.guest)}<br>${esc(t.date)}, ${esc(t.slot)}<br>${tkTxt(t)}<br>Estimated total: ${money(t.total)}${payTxt(t)}</p>`);w.document.close();w.print()}
