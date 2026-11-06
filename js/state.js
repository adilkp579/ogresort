/* In-memory store (S): server data plus the guest's local favourites, bookings and tickets */
/* ===== Data ===== */
const ROOMS={Standard:1,Deluxe:1.35,Suite:1.9};
/* Tax %, service fee and advance % come from the admin (pricing_rules). These are the fallbacks until they load. */
const DEFRULE={stay:{tax_pct:12,service_fee:450,advance_pct:5},activity:{tax_pct:5,service_fee:0,advance_pct:5}};
const DEF={profile:{name:'',email:'',phone:'',loc:'',photo:''},favs:[],bookings:[],tickets:[]};
let S;try{S=JSON.parse(localStorage.getItem('verdane'))}catch(e){}
S={...structuredClone(DEF),...(S||{})};
S.guest=!!(S.guest||S.bookings.length||S.tickets.length);
/* Server-backed data: loaded by services.js, never persisted in the browser */
S.pricing=[];S.hosts=[];S.props=[];S.prods=[];S.inbox=[];S.places=[];S.dests=[];S.progs=[];S.states=[];S.famous=[];S.account=null;S.session=false;
const IMGS={}; /* photo URLs by listing id */
const persist=()=>{const {pricing,props,prods,inbox,places,dests,progs,states,famous,account,session,...keep}=S;return keep};
const save=()=>{try{localStorage.setItem('verdane',JSON.stringify(persist()))}catch(e){toast('Storage full — changes not saved')};if(typeof badge==='function'&&$('#bd'))badge()};
const all=()=>S.props.filter(p=>p.status==='Published');
const find=id=>S.props.find(r=>r.id===id);
const cover=r=>IMGS[r.id]?.[r.cover||0]?`url("${IMGS[r.id][r.cover||0]}")`:r.img;
const typesOf=(r,k)=>r.types&&r.types.length?r.types:(k==='act'?[{name:'Adult',price:r.price},{name:'Child',price:Math.round(r.price*.5)}]:Object.entries(ROOMS).map(([n,m])=>({name:n,price:Math.round(r.price*m)})));
const rateOf=(r,room)=>{const t=typesOf(r,'stay').find(x=>x.name===room);return t?t.price:r.price};
const tkTxt=t=>t.items&&t.items.length?t.items.map(x=>x.qty+' × '+esc(x.name)).join(', '):(t.adults||0)+' adult, '+(t.children||0)+' child';
/* rule for a kind ('stay' | 'activity') + category: category rule, else the kind's default, else the built-in one. Same logic as the Worker. */
const ruleOf=(kind,cat)=>{const k=s=>String(s||'').trim().toLowerCase(),rows=(S.pricing||[]).filter(x=>x.kind===kind),x=(k(cat)&&rows.find(y=>k(y.category)===k(cat)))||rows.find(y=>k(y.category)==='');return x?{tax_pct:+x.tax_pct,service_fee:+x.service_fee,advance_pct:+x.advance_pct}:DEFRULE[kind]};
const advOf=(total,rule)=>Math.round(total*(rule.advance_pct/100));
const calc=(r,room,n)=>{const rule=ruleOf('stay',r.type),base=rateOf(r,room)*n,tax=base*(rule.tax_pct/100);return{base,tax,fee:rule.service_fee,rule,total:Math.round(base+tax+rule.service_fee)}};   /* whole rupees: identical to the server's price */
/* default filter sets for the three search bars */
const QDEF=()=>({q:'',max:20000,rating:0,type:'',am:[],sort:'near',in:'',out:'',g:2}),HQDEF=()=>({q:'',show:'all',type:'',cat:'',max:20000,sort:'near',am:[]}),ACDEF=()=>({q:'',cat:'',max:20000});
/* local calendar date (YYYY-MM-DD), offset by n days. The UTC version is a day behind in India before 5:30 am. */
const localDate=(n=0)=>{const d=new Date();d.setDate(d.getDate()+n);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const today=()=>new Date().toISOString().slice(0,10);
const nights=(a,b)=>Math.round((new Date(b)-new Date(a))/864e5);
