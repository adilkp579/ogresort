/* ===== Init ===== */
const START=['home','resorts','activities','bookings','profile','about','terms','privacy'].includes(location.hash.slice(1))?location.hash.slice(1):'home';
/* Loading screen: 2 seconds while the site boots and the visitor's current location is detected in the background */
const T0=Date.now(),SPL=document.getElementById('splash');
const hideSplash=()=>{if(!SPL||SPL.dataset.h)return;SPL.dataset.h=1;SPL.classList.add('out');setTimeout(()=>SPL.remove(),600)};
setTimeout(hideSplash,6000); /* safety: never stuck on the loading page (e.g. the permission prompt is ignored) */
locPrefetch(); /* GPS + district lookup start NOW, in parallel with loading the data */
boot().finally(()=>{go(START);
 const loc=autoLoc(); /* current location is detected on every visit */
 /* the loading page stays until the district is known (or detection failed), but at least 1.5 s so the welcome text can be read; a visitor who already chose a district manually does not wait */
 const wait=S.locMode==='manual'&&curLoc()?Promise.resolve():loc;
 wait.then(()=>setTimeout(hideSplash,Math.max(0,1500-(Date.now()-T0))))});

/* Scroll-linked search bar: it narrows while it rises, then slides into the header where the location button was (no jumps, no layout shift) */
(()=>{let t=0;const cl=x=>Math.min(1,Math.max(0,x));
window.sbUpd=()=>{t=0;const b=document.body,bar=document.querySelector('.page.on .sbar');
if(!bar||!b.classList.contains('hasbar')){b.style.setProperty('--s',0);b.style.setProperty('--b',0);b.classList.remove('sbin');return}
let sn=bar.previousElementSibling;if(!sn||!sn.classList.contains('sbs')){sn=document.createElement('i');sn.className='sbs';bar.before(sn)}
const y=sn.getBoundingClientRect().top,need=y+scrollY-64,s=need<=1?1:cl(scrollY/need),pb=cl(1-y/64);
b.style.setProperty('--s',s.toFixed(3));b.style.setProperty('--b',pb.toFixed(3));b.classList.toggle('sbin',s>.6);
const hs=bar.querySelector('.hsr'),wr=bar.querySelector('.wrap');if(!hs||!wr)return;
const cs=getComputedStyle(wr),r=wr.getBoundingClientRect(),nl=r.left+parseFloat(cs.paddingLeft),nr=r.right-parseFloat(cs.paddingRight),br=document.querySelector('.top .brand').getBoundingClientRect(),sv=document.querySelector('.top .sv'),
tl=br.right+12,tr=(sv?sv.getBoundingClientRect().left:innerWidth-22)-10;
hs.style.marginLeft=(s*(tl-nl)).toFixed(1)+'px';hs.style.marginRight=(s*(nr-tr)).toFixed(1)+'px'};
const req=()=>{if(!t)t=requestAnimationFrame(sbUpd)};addEventListener('scroll',req,{passive:true});addEventListener('resize',req);sbUpd()})();
