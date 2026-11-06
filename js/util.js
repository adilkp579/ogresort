/* Helpers, generated scenic art, shared constants */
/* ===== Helpers ===== */
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const money=n=>'₹'+Math.round(n).toLocaleString('en-IN');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
/* Neutral placeholder shown only while a listing has no photo yet (no illustrations, no stock images) */
function scene(){const svg=`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'><rect width='400' height='300' fill='#ece8dc'/><circle cx='168' cy='128' r='13' fill='#d6d0ba'/><path d='M112 206l62-72 44 50 28-30 42 52z' fill='#d6d0ba'/></svg>`;return `url("data:image/svg+xml,${encodeURIComponent(svg).replace(/'/g,'%27')}")`}
/* Only plain http(s) links may become href/src values (blocks javascript:, data:, vbscript:) */
function safeUrl(u){try{const x=new URL(String(u||'').trim());return x.protocol==='https:'||x.protocol==='http:'?x.href:''}catch(e){return ''}}
const KIND={r1:'water',r2:'tea',r3:'forest',r4:'pool',r5:'beach',r6:'fort',r7:'cabin',r8:'beach'},ACATK={Water:'water',Nature:'tea',Culture:'fort',Wellness:'beach',Adventure:'forest'};
let AMEN=['Pool','Wi-Fi','Restaurant','Spa','Parking','Beach access'];
let TYPES=['Resort','Hotel','Villa','Homestay'];
/* built-in defaults, used for any option kind the admin has not customised */
const OPT_DEF={resort_type:[...TYPES],amenity:[...AMEN],activity_category:['Water','Nature','Culture','Wellness','Adventure'],destination_type:['Beach','Hill station','Backwaters','Waterfall','Forest & wildlife','Heritage & culture','Temple & pilgrimage','Adventure','Park & garden']};
/* Shared icons for the Home / Resorts / Activities search bars */
const SRCH='<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>';
const FLTR='<svg viewBox="0 0 24 24"><path d="M4 7h9M19 7h1M4 12h3M13 12h7M4 17h9M19 17h1"/><circle cx="16" cy="7" r="2.2"/><circle cx="10" cy="12" r="2.2"/><circle cx="16" cy="17" r="2.2"/></svg>';

/* Shared by the site and the admin dashboard */
const MAPS_OK = /^https:\/\/(((www\.)?google\.[a-z.]+\/maps)|(maps\.google\.[a-z.]+\/)|(maps\.app\.goo\.gl\/)|(goo\.gl\/maps))/i;
const VIDEO_OK = /^https:\/\/((www\.|m\.)?(youtube\.com|facebook\.com|instagram\.com)|youtu\.be|fb\.watch|instagr\.am)\//i;
/* Cover-crop an image file to W x H and return a JPEG data URL */
function cropImg(file,W,H){return new Promise((res,rej)=>{const fr=new FileReader();fr.onload=()=>{const im=new Image();im.onload=()=>{const c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d'),r=Math.max(W/im.width,H/im.height),w=im.width*r,h=im.height*r;x.drawImage(im,(W-w)/2,(H-h)/2,w,h);res(c.toDataURL('image/jpeg',.8))};im.onerror=rej;im.src=fr.result};fr.onerror=rej;fr.readAsDataURL(file)})}
const crop34=f=>cropImg(f,600,800),crop169=f=>cropImg(f,960,540);   /* 3:4 stays/activities, 16:9 popular-destination cards */

/* random id kept in this browser; the database allows 1 like + 1 comment per id per destination */
function deviceId(){try{let d=localStorage.getItem('vd_device');if(!d||d.length<16){d=((crypto.randomUUID&&crypto.randomUUID())||(Date.now().toString(36)+Math.random().toString(36).slice(2)+Math.random().toString(36).slice(2))).replace(/-/g,'');if(d.length<16)d+='0123456789abcdef';localStorage.setItem('vd_device',d)}return d}catch(e){return window.__vdd||(window.__vdd=(Date.now().toString(36)+Math.random().toString(36).slice(2)+'0123456789abcdef').slice(0,32))}}

/* YouTube / Instagram (post, reel) / Facebook video link -> inline player. Returns null for anything else. */
function videoEmbed(u){u=(u||'').trim();let m;
if(m=u.match(/^https:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/i))return{kind:'yt',label:'YouTube',src:'https://www.youtube-nocookie.com/embed/'+m[1]+'?rel=0&playsinline=1'};
if(m=u.match(/^https:\/\/(?:www\.)?instagram\.com\/(?:[A-Za-z0-9_.]+\/)?(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/i))return{kind:'ig',label:'Instagram',src:'https://www.instagram.com/'+(m[1].toLowerCase()==='reels'?'reel':m[1].toLowerCase())+'/'+m[2]+'/embed/'};
if(/^https:\/\/(?:www\.|m\.|web\.)?facebook\.com\/\S+/i.test(u)||/^https:\/\/fb\.watch\/\S+/i.test(u))return{kind:'fb',label:'Facebook',src:'https://www.facebook.com/plugins/video.php?href='+encodeURIComponent(u)+'&show_text=false&width=560'};
return null}
const vFrame=(v,t)=>`<iframe src="${v.src}" title="${t||v.label+' video'}" loading="lazy" allow="autoplay; encrypted-media; picture-in-picture; clipboard-write; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin" sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-presentation"></iframe>`;

/* "Add more link" rows (max 5): w = rows container, addBtn, err = error element, init = existing links. get() returns the non-empty links. */
function vlRows(w,addBtn,err,init){let VL=[...(init||[])];if(!VL.length)VL=[''];
const draw=focus=>{w.innerHTML=VL.map((u,k)=>`<div class="vlr"><input type="url" data-k="${k}" inputmode="url" autocomplete="off" placeholder="Paste YouTube, Instagram or Facebook video link" value="${esc(u)}"><span class="vlt" id="vlt${k}"></span><button type="button" class="vlx" data-k="${k}" aria-label="Remove link">\u00d7</button></div>`).join('');
const tag=k=>{const e=videoEmbed(VL[k]),t=w.querySelector('#vlt'+k);if(t){const s=VL[k].trim();t.textContent=s?(e?e.label+' \u2713':'Invalid'):'';t.className='vlt'+(s?(e?' ok':' bad'):'')}};
w.querySelectorAll('input').forEach(i=>{tag(+i.dataset.k);i.oninput=()=>{VL[+i.dataset.k]=i.value;tag(+i.dataset.k);err.textContent=''}});
w.querySelectorAll('.vlx').forEach(b=>b.onclick=()=>{VL.splice(+b.dataset.k,1);if(!VL.length)VL=[''];draw()});
if(focus){const l=w.querySelectorAll('input');l[l.length-1].focus()}};
addBtn.onclick=()=>{if(VL.length>=5){err.textContent='You can add up to 5 video links';return}VL.push('');draw(true)};draw();
return{get:()=>VL.map(x=>x.trim()).filter(Boolean)}}

/* ===== Shared UI pieces (used by the site AND the admin dashboard) ===== */
function toast(m){const t=document.createElement('div');t.className='toast';t.textContent=m;$('#toasts').append(t);setTimeout(()=>t.remove(),3200)}
const modalHtml=(title,html)=>`<div class="dh"><h3>${title}</h3><button aria-label="Close" onclick="dlg.close()">×</button></div><div class="db">${html}</div>`;
/* labelled text input + error line. v = value, pl = placeholder, x = extra raw attributes */
const fld=(id,l,v='',t='text',pl='',x='')=>`<div><label>${l}<input id="${id}" type="${t}" value="${esc(v)}" placeholder="${pl}" autocomplete="off" ${x}></label><div class="err" id="e_${id}"></div></div>`;
/* three photo boxes with ids pre0..pre2 (multi = tap once and pick all 3 photos) */
const slotsHtml=(pre,multi,names=['Main photo','Photo 2','Photo 3'])=>names.map((t,i)=>`<div class="${i>2?'xs':''}"><label class="slot${i==0?' main':''}" id="${pre}${i}"><input type="file" accept="image/*"${multi?' multiple':''} data-i="${i}" style="display:none"><span>${t}</span></label></div>`).join('');
/* wires the boxes made by slotsHtml: paints existing photos, crops new ones into ph[], reports problems in errEl */
function photoSlots(root,pre,ph,errEl,crop,multi,max=3){const M=()=>typeof max==='function'?max():max;
const paint=i=>{const l=$('#'+pre+i);if(l&&ph[i]){l.style.backgroundImage=`url("${ph[i]}")`;l.classList.add('set')}};
const put=async(i,fl)=>{if(!fl.type.startsWith('image/')||fl.size>8e6){errEl.textContent='Choose images under 8 MB each';return}try{ph[i]=await crop(fl);paint(i)}catch(e){errEl.textContent='Could not read that image'}};
[0,1,2,3,4,5].forEach(paint);
$$(root+' .slot input').forEach(inp=>inp.onchange=async()=>{const fs=[...inp.files];inp.value='';if(!fs.length)return;errEl.textContent='';if(fs.length===1||!multi)return put(+inp.dataset.i,fs[0]);if(fs.length>M())errEl.textContent='Only the first '+M()+' photos were used';await Promise.all(fs.slice(0,M()).map((fl,k)=>put(k,fl)))})}

/* ===== Shared search-bar / filter-panel pieces (Home, Resorts, Activities) ===== */
const toggleFp=(btn,panel)=>()=>{panel.hidden=!panel.hidden;btn.setAttribute('aria-expanded',!panel.hidden)};
const rangeFill=(el,v)=>el.style.setProperty('--p',((v-2000)/18000*100)+'%');
const priceRange=(rid,lid,v)=>`<p class="hlb">Max price: <b id="${lid}">${money(v)}</b></p><input type="range" id="${rid}" min="2000" max="20000" step="500" value="${v}" aria-label="Maximum price">`;
const sortSel=id=>`<p class="hlb">Sort by</p><select id="${id}"><option value="near">Nearest to me</option><option value="pop">Most popular</option><option value="pl">Price: low to high</option><option value="ph">Price: high to low</option><option value="rt">Top rated</option></select>`;
/* chip row: list = [[value,label],...], on(value) says which are selected; attrs = data-k="..." or id="..." */
const chipRow=(attrs,list,on)=>`<div class="hch" ${attrs}>${list.map(([v,l])=>`<button type="button" data-v="${v}" class="${on(v)?'on':''}">${l}</button>`).join('')}</div>`;
const typeChips=(attrs,cur)=>`<p class="hlb">Resort type</p>${chipRow(attrs,['',...TYPES].map(v=>[v,v||'Any']),v=>cur===v)}`;
const amenChips=(attrs,cur)=>`<p class="hlb">Amenities</p>${chipRow(attrs,AMEN.map(a=>[a,a]),a=>cur.includes(a))}`;
const catChips=(attrs,cur)=>`<p class="hlb">Activity category</p>${chipRow(attrs,['',...ACAT].map(v=>[v,v||'Any']),v=>cur===v)}`;
const locChips=(attrs,all)=>`<p class="hlb">Location</p>${chipRow(attrs,[['','My location'],['all','All districts']],v=>(v==='all')===!!all)}`;

/* Skeleton for photos: any element with an inline background-image URL shimmers until the file has loaded. */
(()=>{const RE=/url\(["']?(https?:[^"')]+)/,seen=new WeakMap();
const prep=el=>{const m=RE.exec(el.getAttribute('style')||'');if(!m||seen.get(el)===m[1])return;seen.set(el,m[1]);el.classList.add('imld');const i=new Image(),done=()=>{if(seen.get(el)===m[1])el.classList.remove('imld')};i.onload=i.onerror=done;i.src=m[1];if(i.complete)done()};
const scan=n=>{if(n.nodeType!==1)return;if(n.hasAttribute('style'))prep(n);n.querySelectorAll('[style*="url("]').forEach(prep)};
const go=()=>{new MutationObserver(ms=>ms.forEach(m=>{if(m.type==='attributes')scan(m.target);else m.addedNodes.forEach(scan)})).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['style']});scan(document.body)};
document.body?go():addEventListener('DOMContentLoaded',go)})();

/* ===== Booking contact: Contact number + WhatsApp number (both required). "Same as contact number" copies it automatically. ===== */
const waDigits=n=>{const d=String(n||'').replace(/\D/g,'');return d.length===10?'91'+d:d};
const contactHtml=(p,c='',w='')=>{const same=!w||String(w).replace(/\D/g,'')===String(c).replace(/\D/g,'');
return `<div><label>Contact number<input id="${p}p" type="tel" inputmode="tel" autocomplete="tel" placeholder="Mobile number" value="${esc(c)}"></label><div class="err" id="e_${p}p"></div></div><div><label>WhatsApp number<input id="${p}w" type="tel" inputmode="tel" autocomplete="off" placeholder="WhatsApp number" value="${esc(same?c:w)}"${same?' readonly':''}></label><label style="display:flex;gap:8px;align-items:center;margin-top:6px;font-size:.85rem;cursor:pointer"><input type="checkbox" id="${p}s"${same?' checked':''} style="width:auto;min-height:0;margin:0"> Same as contact number</label><div class="err" id="e_${p}w"></div></div>`};
const contactBind=p=>{const c=$('#'+p+'p'),w=$('#'+p+'w'),s=$('#'+p+'s'),sync=()=>{if(s.checked){w.value=c.value;w.readOnly=true}else w.readOnly=false};
c.addEventListener('input',sync);s.addEventListener('change',()=>{sync();if(!s.checked)w.focus()});sync()};
const contactErr=(p,E)=>{const ok=x=>{const d=String(x).replace(/\D/g,'');return d.length>=10&&d.length<=15};
if(!ok($('#'+p+'p').value))E[p+'p']='Enter your contact number';if(!ok($('#'+p+'w').value))E[p+'w']='Enter your WhatsApp number'};
