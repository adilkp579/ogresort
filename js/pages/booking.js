/* ===== Booking flow ===== */
let BD=null; /* keeps form entries when you tap Back from the review step */
function bookForm(id,mod){const r=find(id),b=mod?S.bookings.find(x=>x.id===mod):null,d=(!mod&&BD&&BD.id===id)?BD:{};
modal((b?'Modify booking':'Book')+' — '+esc(r.name),`<form id="bf" novalidate><div class="two"><div><label>Check-in<input type="date" id="bi" min="${today()}" value="${b?.in||d.bi||Q.in||''}"></label><div class="err" id="e_bi"></div></div><div><label>Check-out<input type="date" id="bo" min="${today()}" value="${b?.out||d.bo||Q.out||''}"></label><div class="err" id="e_bo"></div></div>
<div><label>Room type<select id="br">${typesOf(r,'stay').map(t=>`<option value="${esc(t.name)}" ${(b?.room||d.br)==t.name?'selected':''}>${esc(t.name)} · ${money(t.price)}</option>`).join('')}</select></label></div><div><label>Guests<input type="number" id="bg" min="1" max="${r.cap||6}" value="${b?.guests||d.bg||Q.g||2}"></label><div class="err" id="e_bg"></div></div>
<div><label>Guest name<input id="bn" value="${esc(b?.guest||d.bn||S.profile.name)}"></label><div class="err" id="e_bn"></div></div>${contactHtml('b',b?.phone||d.bp||S.profile.phone,b?.whatsapp||d.bw||S.profile.wa)}</div>
<div class="sum" id="bs"></div><div class="row"><button class="btn g">${b?'Save changes':'Review summary'}</button></div></form>`);
contactBind('b');
const sumUp=()=>{const a=$('#bi').value,o=$('#bo').value,n=a&&o?nights(a,o):0;$('#bs').innerHTML=n>0?(c=>`<div><span>${money(rateOf(r,$('#br').value))} × ${n} night${n>1?'s':''}</span><span>${money(c.base)}</span></div><div><span>Taxes (${c.rule.tax_pct}%)</span><span>${money(c.tax)}</span></div>${c.fee>0?`<div><span>Service fee</span><span>${money(c.fee)}</span></div>`:''}<div><b>Estimated total</b><b class="price">${money(c.total)}</b></div>`)(calc(r,$('#br').value,n)):'<span class="sub">Choose dates to see your estimated price.</span>'};
$$('#bf input,#bf select').forEach(i=>i.oninput=sumUp);
const syncOut=()=>{const a=$('#bi').value;if(!a)return;const nx=new Date(a);nx.setUTCDate(nx.getUTCDate()+1);const m=nx.toISOString().slice(0,10);$('#bo').min=m;if($('#bo').value&&$('#bo').value<m)$('#bo').value=''};
$('#bi').addEventListener('input',()=>{syncOut();sumUp()});syncOut();
const AV=availAttach({id:r.id,ref:b?b.id:null,anchor:$('#bo').closest('label').parentElement,inEl:$('#bi'),outEl:$('#bo')});
$$('#bf input,#bf select').forEach(i=>i.addEventListener('input',()=>{i.classList.remove('bad');const e=$('#e_'+i.id);if(e)e.textContent=''}));sumUp();
$('#bf').onsubmit=e=>{e.preventDefault();$$('.err').forEach(x=>x.textContent='');$$('#bf .bad').forEach(x=>x.classList.remove('bad'));const E={};const a=$('#bi').value,o=$('#bo').value,g=+$('#bg').value;
if(!a)E.bi='Pick a check-in date';else if(a<today())E.bi='Check-in can\u2019t be in the past';
if(!o)E.bo='Pick a check-out date';else if(a&&o<=a)E.bo='Check-out must be after check-in';
if(!(g>=1&&g<=(r.cap||6)))E.bg=`Guests must be 1–${r.cap||6}`;if(!$('#bn').value.trim())E.bn='Enter the guest name';
contactErr('b',E);
if(Object.keys(E).length){for(const k in E){$('#e_'+k).textContent=E[k];$('#b'+k.slice(1)).classList.add('bad')}return}
if(AV.conflict()){AV.show(true);return}
const n=nights(a,o),c=calc(r,$('#br').value,n),data={guest:$('#bn').value.trim(),in:a,out:o,room:$('#br').value,guests:g,total:c.total};
if(!b)BD={id,bi:a,bo:o,br:$('#br').value,bg:g,bn:data.guest,bp:$('#bp').value,bw:$('#bw').value};
if(b){const btn=$('#bf .btn');if(!b.key)return toast('This older booking can\u2019t be changed online. Please contact the host.');btn&&(btn.disabled=true);API.modifyBooking(b.id,b.key,{in:data.in,out:data.out,room:data.room,guests:data.guests,name:data.guest}).then(r=>{Object.assign(b,{in:data.in,out:data.out,room:data.room,guests:data.guests,guest:data.guest,total:r.total,pay:r.pay||b.pay});save();dlg.close();toast('Booking updated');go('bookings')}).catch(e=>{btn&&(btn.disabled=false);toast(e.message||'Could not update the booking')});return}
CK={kind:'stay',id,data,n,c,phone:$('#bp').value.trim(),wa:$('#bw').value.trim()};dlg.close();go('checkout')}}
