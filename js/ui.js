/* Shared UI: dialog, navigation, cards, tab highlight */
/* ===== Dialog ===== */
const dlg=$('#dlg');
function modal(title,html){dlg.classList.remove('glass','lpk','vall');dlg.innerHTML=modalHtml(title,html);if(!dlg.open)dlg.showModal();dlg.scrollTop=0}
function confirmBox(msg,yes,label='Confirm'){modal('Please confirm',`<p>${msg}</p><div class="row"><button class="btn d" id="cy">${label}</button><button class="btn o" onclick="dlg.close()">Keep it</button></div>`);$('#cy').onclick=()=>{dlg.close();yes()}}
dlg.addEventListener('click',e=>{if(e.target===dlg)dlg.close()});
/* ===== Navigation ===== */
function badge(){const lc=$('#lc');if(lc){lc.textContent=locLabel();lc.classList.toggle('skb',lc.textContent==='Detecting\u2026');const lb=lc.parentElement;lb&&lb.classList.toggle('live',S.locMode!=='manual'&&((!!LIVE&&!!curLoc())||!!DET))}const sb=$('#sb');if(sb)sb.textContent=S.favs.length||'';const n=S.bookings.filter(b=>bTab(b)==='Upcoming').length+S.tickets.filter(t=>bTab(t)==='Upcoming').length+(S.session&&S.account?ownItems().filter(x=>x.b.status==='Pending').length:0);$('#bd').textContent=n||''}
const navOf=p=>p==='detail'||p==='checkout'?navOf(D.from):p==='place'||p==='alldest'||p==='allprog'||p==='allres'||p==='host'?'home':p==='dates'?'profile':p;
/* ===== Navigation with memory: Back (browser/phone back or the in-page back buttons) returns to the previous page AND the spot you were at ===== */
const NAVS=new Map();let NAVI=-1,NAVN=-1;
try{history.scrollRestoration='manual'}catch(e){}
const navKey=p=>p==='dates'?DT.id:p==='detail'?D.kind+D.id:p==='place'?PLC.placeId+'|'+PLC.title+'|'+(PLC.state||''):p==='alldest'?'va'+VA.placeId:p==='allprog'?'pa':p==='allres'?'ar':p==='host'?'h'+HC.rid:'';
const navCtx=()=>({D:{...D},PLC:{...PLC},CK,HST,Q:{...Q},HQ:{...HQ,am:[...HQ.am]},AC:{...AC},BT,BV,BBT,DT:{...DT},VA:{...VA},PA:{...PA},HC:{...HC}});
const navSet=c=>{D={...c.D};PLC={...c.PLC};CK=c.CK;HST=c.HST;Q={...c.Q};HQ={...c.HQ,am:[...c.HQ.am]};AC={...c.AC};BT=c.BT;BV=c.BV;BBT=c.BBT;DT={...c.DT};VA={...(c.VA||{placeId:''})};PA={...(c.PA||{pay:'all'})};HC={...(c.HC||{owner:'',rid:''})}};
function go(p,pe){
const cur=NAVS.get(NAVI);
if(pe){navSet(pe.ctx);NAVI=pe.i}
else{
if(cur){cur.y=scrollY;if(cur.p==='home'){cur.ctx.HQ={...HQ,am:[...HQ.am]};cur.ctx.HST=HST}else if(cur.p==='resorts')cur.ctx.Q={...Q};else if(cur.p==='activities')cur.ctx.AC={...AC};else if(cur.p==='allprog')cur.ctx.PA={...PA}}
const k=navKey(p);
if(cur&&cur.p===p&&cur.k===k){cur.ctx=navCtx();try{history.replaceState({i:cur.i},'','#'+p)}catch(e){}}
else{const e={i:++NAVN,p,k,y:0,ctx:navCtx()};NAVS.set(e.i,e);try{(cur?history.pushState:history.replaceState).call(history,{i:e.i},'','#'+p)}catch(x){}NAVI=e.i}}
badge();document.body.classList.toggle('onhero',false);document.body.classList.toggle('hasbar',['home','resorts','activities'].includes(p));document.body.classList.toggle('onprof',p==='profile');$$('.page').forEach(x=>x.classList.toggle('on',x.id===p));$$('nav button').forEach(b=>b.classList.toggle('on',b.dataset.p===navOf(p)));({home:rHome,resorts:rResorts,activities:rActs,detail:rDetail,place:rPlace,host:rHost,alldest:rAllDest,allprog:rAllProg,allres:rAllRes,dates:rDates,checkout:rCheckout,bookings:rBookings,profile:rProfile,about:rAbout,terms:rTerms,privacy:rPrivacy})[p]();
if(pe){const y=pe.y||0,to=()=>scrollTo({top:y,behavior:'instant'});to();requestAnimationFrame(to);setTimeout(to,80)}else scrollTo({top:0,behavior:'instant'});if(window.sbUpd)sbUpd()}
function goBack(fb){const c=NAVS.get(NAVI);if(c&&c.i>0&&history.length>1)history.back();else go(fb||'home')}
addEventListener('popstate',e=>{let en=e.state&&NAVS.get(e.state.i);
if(!en){const h=location.hash.slice(1),q=['home','resorts','activities','bookings','profile','about','terms','privacy'].includes(h)?h:'home';en={i:++NAVN,p:q,k:'',y:0,ctx:navCtx()};NAVS.set(en.i,en);try{history.replaceState({i:en.i},'','#'+q)}catch(x){}}
document.querySelectorAll('dialog[open]').forEach(d=>{try{d.close()}catch(x){}});go(en.p,en)});
$$('nav button').forEach(b=>b.onclick=()=>go(b.dataset.p));
/* Contact (footer) opens WhatsApp chat directly; number comes from js/config.js */
(()=>{const C=window.VERDANE_CONFIG||{},num=String(C.WHATSAPP_NUMBER||'').replace(/\D/g,''),ok=/^\d{10,15}$/.test(num),url=ok?'https://wa.me/'+num+'?text='+encodeURIComponent(C.WHATSAPP_MESSAGE||'Hi Verdane'):'';
$$('[data-wa]').forEach(a=>{if(ok)a.href=url;else a.onclick=e=>{e.preventDefault();modal('Contact','<p>WhatsApp contact is not set up yet. For a booking question, contact the stay or activity owner from its page.</p>')}})})();
/* ===== Report a bug (footer) ===== */
const BUG_OK='<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
$$('[data-bug]').forEach(a=>{a.setAttribute('role','button');a.tabIndex=0;a.onkeydown=e=>{if(e.key==='Enter')a.click()};a.onclick=()=>{
modal('Report a bug',`<form id="bgf" novalidate><p class="sub" style="margin:0 0 12px">Something not working? Tell us what happened and we will look into it.</p>
<label>Your email<input id="bgc" type="email" maxlength="80" autocomplete="email" placeholder="you@example.com"></label><div class="err" id="e_bgc"></div>
<label style="margin-top:12px">What went wrong?<textarea id="bgm" rows="5" maxlength="1000" placeholder="e.g. The Book button on a resort page does nothing" style="resize:vertical"></textarea></label><div class="err" id="e_bgm"></div>
<div class="row"><button class="btn g" id="bgo">Submit report</button></div></form>`);
$('#bgf').onsubmit=async e=>{e.preventDefault();const m=$('#bgm').value.trim(),c=$('#bgc').value.trim(),ec=$('#e_bgc'),em=$('#e_bgm');
ec.textContent=/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(c)?'':'Enter a valid email address.';em.textContent=m.length>=10?'':'Please describe the problem in at least 10 characters.';
if(ec.textContent||em.textContent)return;
const b=$('#bgo');b.disabled=true;b.textContent='Sending…';
try{await API.bugReport(m,c,(S&&S.page)||location.hash.slice(1)||'home');
$('#dlg .db').innerHTML=`<div style="text-align:center;padding:10px 0 4px"><div style="width:64px;height:64px;border-radius:50%;background:#dcefe5;color:#14523a;display:grid;place-items:center;margin:0 auto 14px">${BUG_OK}</div><h3 style="margin:0 0 6px">Thank you!</h3><p class="sub" style="margin:0 auto 16px;max-width:320px">Your report has been submitted. Our team will look into it and may contact you at <b>${esc(c)}</b>.</p><button class="btn g" onclick="dlg.close()">Close</button></div>`}
catch(x){b.disabled=false;b.textContent='Submit report';em.textContent=/bug_reports|function/i.test(x.message||'')?'Bug reports are not set up yet.':(x.message||'Could not send. Try again.')}}}});
/* ===== Cards ===== */
const stars=r=>`★ ${r.rating.toFixed(1)}`;
/* one card for stays and activities: open = detail function name, unit = night | ticket */
const lcard=(x,open,img,sub,unit)=>`<article class="card go" onclick="${open}('${x.id}')" role="link" tabindex="0" onkeydown="if(event.key==='Enter')${open}('${x.id}')"><div class="im" data-did="${x.id}" style='background-image:${img}'><div class="dsa">${socBtns(x.id,dsoc(x.id))}</div></div><div class="b"><h3>${esc(x.name)}</h3><div class="sub">${sub}</div><div class="price">${money(x.price)}<span class="sub"> /${unit}</span></div></div></article>`;
function card(r){return lcard(r,'detail',cover(r),`${esc(r.city)}, ${esc(r.state)}`,'night')}
function fav(id){const i=S.favs.indexOf(id);i<0?S.favs.push(id):S.favs.splice(i,1);save();toast(i<0?'Saved to favourites':'Removed from favourites');const p=$('.page.on').id;go(p)}
/* ===== Sliding tab highlight ===== */
const lastTab={};let tabRaf=0;
function enhanceTabs(){$$('.tabs,.au-tg').forEach(t=>{if(!t.offsetParent)return;const on=t.querySelector('button.on');if(!on)return;let ind=t.querySelector('.ti');const fresh=!ind;if(fresh){ind=document.createElement('i');ind.className='ti';t.prepend(ind)}
const pg=t.closest('.page'),key=(pg?pg.id:'x')+'#'+[...(pg||document).querySelectorAll('.tabs,.au-tg')].indexOf(t),to={l:on.offsetLeft,w:on.offsetWidth},from=lastTab[key];
if(fresh&&from){t.scrollLeft=from.sl||0;ind.style.transition='none';ind.style.transform=`translateX(${from.l}px)`;ind.style.width=from.w+'px';void ind.offsetWidth;ind.style.transition=''}
ind.style.transform=`translateX(${to.l}px)`;ind.style.width=to.w+'px';let sl=0;if(from&&t.scrollWidth>t.clientWidth+2){sl=Math.max(0,Math.min(t.scrollWidth-t.clientWidth,on.offsetLeft-(t.clientWidth-on.offsetWidth)/2));t.scrollTo({left:sl,behavior:'smooth'})}to.sl=sl;lastTab[key]=to})}
new MutationObserver(()=>{cancelAnimationFrame(tabRaf);tabRaf=requestAnimationFrame(enhanceTabs)}).observe($('main'),{childList:true,subtree:true});

/* Tap outside the sticky search bar to close its filter panel */
document.addEventListener('click',e=>{if(e.target.closest('.sbar'))return;$$('.sbar .hfp').forEach(p=>{if(p.hidden)return;p.hidden=true;const b=p.parentElement.querySelector('.hfl');b&&b.setAttribute('aria-expanded','false')})});
