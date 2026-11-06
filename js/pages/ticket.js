/* ===== Booking ticket: hides personal details on screen, full details inside the QR ===== */
const TK_OK=s=>s==='Upcoming'||s==='Pending'||s==='Completed';
function tkData(kind,id){
const stay=kind==='stay',b=(stay?S.bookings:S.tickets).find(x=>x.id===id);if(!b)return null;
const r=stay?(find(b.rid)||{name:'Removed property',city:''}):(actOf(b.aid)||NOACT);
const when=stay?`${b.in} → ${b.out}`:`${b.date}, ${b.slot}`;
return{b,r,stay,id,name:b.guest,type:stay?'Stay':'Activity',cat:stay?(b.room||'Stay'):(r.cat||'Activity'),when,
qr:['VERDANE BOOKING','Booking no: '+id,'Name: '+b.guest,'Type: '+(stay?'Stay':'Activity'),'Category: '+(stay?b.room:(r.cat||'Activity')),'Property: '+r.name,'Date: '+when,'Mobile: '+(b.phone||'-'),stay?'Guests: '+b.guests:'Tickets: '+tkTxt(b),'Status: '+bLabel(b)].join('\n')}}
function tkQR(txt){try{const q=qrcode(0,'M');q.addData(txt);q.make();return q.createSvgTag({cellSize:4,margin:0,scalable:true})}catch(e){return'<div class="sub">QR unavailable</div>'}}
function tkHtml(d){const lg=new URL('img/logo.png',location.href).href;
return `<div class="tkw"><div class="tk tk-a"><div class="tk-h"><img src="${lg}" alt="" class="tk-lg"><b>VERDANE</b><span>Resorts &amp; Stays</span></div>
<div class="tk-t">${esc(d.type)}</div><div class="tk-c">${esc(d.cat)}</div>
<div class="tk-g"><div><small>Name</small><b>${esc(d.name)}</b></div><div><small>Date</small><b>${esc(d.when)}</b></div></div></div>
<div class="tk tk-b"><div class="tk-q">${tkQR(d.qr)}</div><p>Scan to see full booking details</p></div></div>`}
function tkView(kind,id){const d=tkData(kind,id);if(!d)return;
modal('Your ticket',`${tkHtml(d)}<div class="row"><button class="btn" onclick="tkPrint('${kind}','${id}')">Print ticket</button></div>`)}
function tkPrint(kind,id){const d=tkData(kind,id);if(!d)return;const w=open('','_blank');if(!w)return toast('Allow pop-ups to print');
w.document.write(`<title>Ticket ${esc(id)}</title><link rel="stylesheet" href="${new URL('css/styles.css',location.href).href}"><body style="background:#fff;padding:30px 0;-webkit-print-color-adjust:exact;print-color-adjust:exact">${tkHtml(d)}`);
w.document.close();setTimeout(()=>{w.focus();w.print()},500)}
