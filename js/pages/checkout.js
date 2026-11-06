/* ===== Checkout page (separate page, same file) ===== */
let CK=null;                     /* CK.pm = chosen payment option: 'advance' (admin-set %) or 'full' */
function rCheckout(){if(!CK)return go('home');const T=CK.kind==='ticket',r=T?actOf(CK.id):find(CK.id);
const rows=T?`<div><span>${CK.d}, ${CK.sl}</span></div><div><span>${tkTxt(CK.t)}</span></div><div><span>Subtotal</span><span>${money(CK.t.sub)}</span></div><div><span>Taxes (${CK.t.rule.tax_pct}%)</span><span>${money(CK.t.tax)}</span></div>${CK.t.fee>0?`<div><span>Service fee</span><span>${money(CK.t.fee)}</span></div>`:''}<div><b>Total</b><b class="price">${money(CK.t.total)}</b></div>`
:`<div><span>${esc(CK.data.in)} \u2192 ${esc(CK.data.out)}</span><span>${CK.n} night${CK.n>1?'s':''}</span></div><div><span>${esc(CK.data.room)} room, ${esc(CK.data.guests)} guest${CK.data.guests>1?'s':''}</span></div><div><span>Room charges</span><span>${money(CK.c.base)}</span></div><div><span>Taxes (${CK.c.rule.tax_pct}%)</span><span>${money(CK.c.tax)}</span></div>${CK.c.fee>0?`<div><span>Service fee</span><span>${money(CK.c.fee)}</span></div>`:''}<div><b>Total</b><b class="price">${money(CK.c.total)}</b></div>`;
const who=T?CK.nm:CK.data.guest,TOT=T?CK.t.total:CK.data.total,RULE=T?CK.t.rule:CK.c.rule,ADV=advOf(TOT,RULE),where=T?'venue':'property';
const payRows=`<div><span>Pay now</span><b id="ckpn"></b></div><div><span>Balance at the ${where}</span><span id="ckbl"></span></div>`;
$('#checkout').innerHTML=`<section style="padding-top:100px"><div class="wrap"><button class="btn o sm" onclick="ckBack()">\u2190 Edit details</button><h2 style="margin-top:16px">Checkout</h2><div class="dp"><div>
<h3>Guest details</h3><div class="sum"><div><span>Name</span><b>${esc(who)}</b></div><div><span>Contact number</span><span>${esc(CK.phone)}</span></div><div><span>WhatsApp number</span><span>${esc(CK.wa)}</span></div></div>
<h3 style="margin-top:22px">Special requests</h3><textarea id="ckn" rows="3" placeholder="Anything we should tell the property? (optional)"></textarea>
<h3 style="margin:22px 0 10px">Payment</h3>
<label class="opt"><input type="radio" name="pay" value="advance" ${CK.pm==='full'?'':'checked'} onchange="ckPayUpdate()"><span><b>Pay advance (${RULE.advance_pct}%)</b> \u00b7 ${money(ADV)}<br><span class="sub">Pay ${money(ADV)} now. The remaining ${money(TOT-ADV)} is paid at the ${where}.</span></span></label>
<label class="opt"><input type="radio" name="pay" value="full" ${CK.pm==='full'?'checked':''} onchange="ckPayUpdate()"><span><b>Pay full amount</b> \u00b7 ${money(TOT)}<br><span class="sub">Pay the whole ${money(TOT)} now. Nothing left to pay later.</span></span></label>

</div><aside class="side card"><div class="im" style='background-image:${r.id&&!T?cover(r):r.img};aspect-ratio:16/9'></div><div class="b" style="padding:12px 20px 20px"><h3>${esc(r.name)}</h3><div class="sub">${esc(r.city)}</div><div class="sum">${rows}${payRows}</div><button class="btn" id="ckbtn" style="width:100%" onclick="confirmCheckout()">Confirm ${T?'tickets':'booking'}</button></div></aside></div></div></section>`;ckPayUpdate()}
/* what the guest pays now: the advance %, or the full amount */
function ckPayUpdate(){const T=CK.kind==='ticket',TOT=T?CK.t.total:CK.data.total,adv=document.querySelector('input[name=pay]:checked').value==='advance',now=adv?advOf(TOT,T?CK.t.rule:CK.c.rule):TOT;CK.pm=adv?'advance':'full';$('#ckpn').textContent=money(now);$('#ckbl').textContent=money(TOT-now);$('#ckbtn').textContent=`Pay ${money(now)} & confirm ${T?'tickets':'booking'}`}
/* ---- Online payment (Razorpay). The server decides every amount; this page only shows what it returns. ---- */
async function ckRelease(){const o=CK&&CK.order;if(!o)return;CK.order=null;try{await API.guestCancel(o.ref,o.key)}catch(e){}S.bookings=S.bookings.filter(x=>x.id!==o.ref);S.tickets=S.tickets.filter(x=>x.id!==o.ref);save()}
async function ckBack(){if(!CK)return go('home');const id=CK.id,T=CK.kind==='ticket';await ckRelease();T?tForm(id):bookForm(id)}
/* remember the booking locally right away (status "Payment pending") so it can still be cancelled/refreshed after a reload */
function ckRecord(T,o,note){const base={id:o.ref,key:o.key,status:'AwaitingPayment',pay:null,note,phone:CK.phone,whatsapp:CK.wa,at:Date.now()};
if(T)S.tickets.unshift({...base,aid:CK.id,guest:CK.nm,date:CK.d,slot:CK.sl,items:CK.t.items,total:o.total});
else S.bookings.unshift({...base,rid:CK.id,...CK.data,total:o.total,phone:CK.phone});save()}
async function confirmCheckout(){
if(!CK||!API.ready()||!CLOUD.ready())return toast('Online booking is not available right now');
const T=CK.kind==='ticket',note=$('#ckn').value.trim(),pm=document.querySelector('input[name=pay]:checked').value==='full'?'full':'advance',btn=$('#ckbtn'),label=btn.textContent;
btn.disabled=true;btn.textContent='Preparing secure payment\u2026';
try{
 if(CK.order&&CK.order.pm!==pm)await ckRelease();                       /* switched advance/full: release the old hold first */
 if(!CK.order){
  const payload=T?{kind:'activity',listing_id:CK.id,name:CK.nm,phone:CK.phone,whatsapp:CK.wa,note,pay_mode:pm,activity:{date:CK.d,slot:CK.sl,items:CK.t.items.map(i=>({name:i.name,qty:i.qty}))}}
   :{kind:'stay',listing_id:CK.id,name:CK.data.guest,phone:CK.phone,whatsapp:CK.wa,note,pay_mode:pm,stay:{in:CK.data.in,out:CK.data.out,room:CK.data.room,guests:CK.data.guests}};
  const o=await API.checkoutOrder(payload);o.pm=pm;CK.order=o;ckRecord(T,o,note);
 }
 await CLOUD.loadRazorpay();
 const o=CK.order,r=T?actOf(CK.id):find(CK.id);
 const rz=new Razorpay({key:o.key_id,order_id:o.order_id,amount:o.amount_paise,currency:'INR',name:'Verdane',description:(T?'Tickets \u00b7 ':'Stay \u00b7 ')+(r?r.name:''),
  prefill:{name:T?CK.nm:CK.data.guest,contact:CK.phone},notes:{ref:o.ref},theme:{color:'#163D32'},
  handler:resp=>ckPaid(resp,btn,label),
  modal:{ondismiss:()=>{btn.disabled=false;btn.textContent=label;toast('Payment not completed. Your dates are held for '+o.hold_minutes+' minutes: tap Pay to try again.')}}});
 rz.on('payment.failed',e=>toast((e.error&&e.error.description)||'Payment failed. Please try another method.'));
 rz.open();
}catch(e){btn.disabled=false;btn.textContent=label;toast(e.message||'Could not start the payment')}}
/* Razorpay says "paid": the server verifies the signature, asks Razorpay again, then confirms the booking */
async function ckPaid(resp,btn,label){
const o=CK.order,T=CK.kind==='ticket',ref=o.ref;btn.disabled=true;btn.textContent='Confirming your payment\u2026';
let res=null;
try{res=await API.checkoutVerify({ref,key:o.key,razorpay_order_id:resp.razorpay_order_id,razorpay_payment_id:resp.razorpay_payment_id,razorpay_signature:resp.razorpay_signature})}catch(e){}
const rec=(T?S.tickets:S.bookings).find(x=>x.id===ref);
if(res&&rec){rec.status=res.status;rec.pay=res.pay;rec.total=res.total}
S.guest=true;S.profile={...S.profile,name:T?CK.nm:CK.data.guest,phone:CK.phone,wa:CK.wa};save();BD=null;
const total=res?res.total:o.total,now=res&&res.pay?res.pay.now:o.pay_now,later=Math.max(0,total-now),where=T?'venue':'property',pending=!res;CK=null;
if(T)BT='Tickets';else BT='All';
$('#checkout').innerHTML=`<section style="padding-top:100px"><div class="wrap"><div class="card" style="max-width:560px;margin:0 auto;text-align:center"><div class="b" style="padding:34px 24px"><h2 style="margin-bottom:10px">${pending?'Payment received':(T?'Tickets booked':'Reservation booked')}</h2><p>Your reference is <b>${esc(ref)}</b>.</p>${pending?'<p class="sub" style="margin-top:6px">We could not confirm it on screen, but your payment went through. It will appear under Bookings within a minute.</p>':'<p class="sub" style="margin-top:6px">The host needs to confirm this. Track it under Bookings. If the host declines, you are refunded automatically.</p>'}<p style="margin:12px 0 4px"><b>Paid online: ${money(now)}</b></p><p class="sub" style="margin:0 0 20px">${later?`${money(later)} is paid at the ${where}.`:'Nothing left to pay later.'}</p><div class="row" style="justify-content:center"><button class="btn" onclick="go('bookings')">View my bookings</button>${pending?'':`<button class="btn o" onclick="${T?`tPrint('${ref}')`:`bPrint('${ref}')`}">Print confirmation</button>`}</div></div></div></div></section>`;scrollTo({top:0,behavior:'instant'});syncBookings()}
