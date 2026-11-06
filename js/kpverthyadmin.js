/* Verdane admin dashboard: separate app, separate login, separate session.
   Only accounts with profiles.role = 'admin' can enter. Real enforcement is in the database (RLS). */
const SB = supabaseReady() ? makeClient('verdane-admin-auth') : null;
const app = $('#app'), dlg = $('#dlg');
const A = { cm: [], cq: '', user: null, L: [], places: [], owners: [], dests: [], progs: [], pf: 'pending', hero: [], famous: [], states: [], opts: [], fm: { mode: 'state', st: '', pid: '' }, bugs: [], bf: 'open', hp: '', tab: 'Overview', f: 'all', df: 'pending', q: '', nav: false };
const ST = { pending: 'Pending', published: 'Published', rejected: 'Rejected' };
const tagCls = s => (s === 'published' ? 'ok' : s === 'pending' ? 'wait' : 'no');
const placeTxt = l => (l.places ? `${esc(l.places.city)}, ${esc(l.places.state)}` : '—');
const chk = r => { if (r.error) throw r.error; return r.data; };

/* ---------- tiny UI helpers ---------- */
function modal(title, html) {
  dlg.innerHTML = modalHtml(title, html);
  if (!dlg.open) dlg.showModal(); dlg.scrollTop = 0;
}
function ask(msg, label, fn) {
  modal('Please confirm', `<p>${msg}</p><div class="row"><button class="btn d" id="cy">${label}</button><button class="btn o" onclick="dlg.close()">Cancel</button></div>`);
  $('#cy').onclick = async () => { dlg.close(); try { await fn(); } catch (e) { toast(e.message); } };
}
dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });

/* ---------- login ---------- */
function renderLogin(msg = '') {
  app.innerHTML = `<div class="alog"><div class="au"><div class="au-top"><svg viewBox="0 0 64 64" width="54" height="54" aria-hidden="true"><path d="M10 16 32 52 54 16" stroke="#163D32" stroke-width="9" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="32" cy="9" r="5" fill="#C5A46D"/></svg><b>Verdane</b><span class="sub">Admin dashboard</span></div>
<div class="au-body"><p class="au-n" style="margin-top:0">Sign in with an admin account. Business owner accounts cannot sign in here.</p>
<form id="lf" novalidate><div class="au-f"><label for="em">Email</label><input id="em" type="email" autocomplete="username"></div>
<div class="au-f"><label for="pw">Password</label><input id="pw" type="password" autocomplete="current-password"></div>
<div class="err" id="le">${esc(msg || (SB ? '' : 'Supabase is not configured. Edit js/config.js.'))}</div><button class="au-b">Log in</button></form></div></div></div>`;
  $('#lf').onsubmit = async e => {
    e.preventDefault(); if (!SB) return;
    const b = $('.au-b'); b.disabled = true;
    try {
      const { error } = await SB.auth.signInWithPassword({ email: $('#em').value.trim(), password: $('#pw').value });
      if (error) throw error;
      await enter();
    } catch (err) { b.disabled = false; const le = $('#le'); if (le) le.textContent = err.message || 'Could not sign in'; }
  };
}

async function enter() {
  app.innerHTML = '<div style="padding:24px;max-width:1000px;margin:0 auto" aria-busy="true" aria-label="Loading"><div class="skb" style="height:34px;width:220px;margin-bottom:20px"></div><div class="skb" style="height:64px;margin-bottom:12px"></div><div class="skb" style="height:64px;margin-bottom:12px"></div><div class="skb" style="height:64px;margin-bottom:12px"></div><div class="skb" style="height:64px;margin-bottom:12px"></div><div class="skb" style="height:64px;margin-bottom:12px"></div></div>';
  const { data: { session } } = await SB.auth.getSession();
  if (!session) return renderLogin();
  const p = chk(await SB.from('profiles').select('*').eq('id', session.user.id).maybeSingle());
  if (!p || p.role !== 'admin') { await SB.auth.signOut(); return renderLogin('This account does not have admin access.'); }
  A.user = p; await loadAll(); await loadMoney(); await loadPricingRules(); render();
}

async function loadAll() {
  const [l, p, o, d, h, cmr, lcm, fam, sts, bg, opt, prg] = await Promise.all([
    SB.from('listings').select('*, places(city,state), profiles(business_name,phone,email)').order('created_at', { ascending: false }),
    SB.from('places').select('*').order('state').order('city'),
    SB.from('profiles').select('*').eq('role', 'owner').order('created_at', { ascending: false }),
    SB.from('destinations').select('*').order('created_at', { ascending: false }),
    SB.from('hero_cards').select('*').order('sort').order('created_at'),
    SB.from('dest_comments').select('*, destinations(name,city)').order('created_at', { ascending: false }),
    SB.from('listing_comments').select('*, listings(name,city)').order('created_at', { ascending: false }),
    SB.from('famous_places').select('*').order('sort').order('created_at'),
    SB.from('states').select('*'),
    SB.from('bug_reports').select('*').order('created_at', { ascending: false }),
    SB.from('site_options').select('*').order('sort').order('created_at'),
    SB.from('programs').select('*').order('program_date', { ascending: false }).order('created_at', { ascending: false })]);
  A.L = chk(l); A.places = chk(p); A.owners = chk(o);
  A.famous = fam.error ? [] : fam.data;   // empty until supabase/schema.sql is run
  A.bugs = bg.error ? [] : bg.data;   // empty until supabase/schema.sql is run
  A.states = sts.error ? [] : sts.data;
  A.opts = opt.error ? [] : opt.data;   // empty until supabase/schema.sql is run
  A.hero = h.error ? [] : h.data;   // empty until supabase/schema.sql is run
  A.cm = [...(cmr.error ? [] : cmr.data.map(c => ({ ...c, _t: 'dest' }))), ...(lcm.error ? [] : lcm.data.map(c => ({ ...c, dest_id: c.listing_id, destinations: c.listings, _t: 'listing' })))].sort((x, y) => y.created_at.localeCompare(x.created_at));   // empty until supabase/schema.sql is run
  A.psub = {}; try { const ps = await SB.from('program_submitters').select('*'); (ps.data || []).forEach(x => A.psub[x.program_id] = x); } catch (e) { }
  A.progs = prg.error ? [] : prg.data;   // empty until supabase/schema.sql is run
  A.dests = d.error ? [] : d.data;   // empty until supabase/schema.sql is run
}

/* ---------- dashboard ---------- */
const IC = {
  Overview: '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  Approvals: '<path d="M5 12l5 5L20 7"/>',
  Destinations: '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  Programs: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4M9 15h6"/>',
  States: '<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>',
  Districts: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h2M14 8h2M8 12h2M14 12h2M10 21v-4h4v4"/>',
  Resorts: '<path d="M3 20V9l9-5 9 5v11"/><path d="M3 20h18M9 20v-6h6v6"/>',
  Activities: '<circle cx="12" cy="5" r="2"/><path d="M12 7v6l-4 7M12 13l4 7M6 11l6-2 6 2"/>',
  'Comments': '<path d="M21 11.500a8.500 8.500 0 0 1-12.300 7.600L3.500 20.500l1.500-4.600A8.500 8.500 0 1 1 21 11.500z"/>',
  'Filter options': '<path d="M4 6h16M7 12h10M10 18h4"/>',
  'All resorts': '<path d="M3 21V9l9-6 9 6v12"/><path d="M9 21v-6h6v6"/>',
  'Home sections': '<rect x="3" y="4" width="18" height="7" rx="2"/><rect x="3" y="14" width="18" height="6" rx="2"/>',
  'Famous places': '<path d="M12 3l2.600 5.600 6 .8-4.400 4.200 1.100 6L12 16.700 6.700 19.600l1.100-6L3.400 9.400l6-.8z"/>',
  'Hero cards': '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 15l5-4 4 3 3-2 6 4"/>',
  Bugs: '<rect x="8" y="8" width="8" height="11" rx="4"/><path d="M9 8a3 3 0 0 1 6 0M4 12h4M16 12h4M5 6l3 3M19 6l-3 3M5 19l3-3M19 19l-3-3"/>',
  Owners: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  Bookings: '<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M8 3v4M16 3v4M4 10h16M8 15l2.500 2.500L16 13"/>',
  Pricing: '<path d="M20 12l-8 8-9-9V3h8z"/><circle cx="7.500" cy="7.500" r="1.500"/>',
  'Owner payments': '<rect x="3" y="6" width="18" height="13" rx="2"/><circle cx="12" cy="12.500" r="2.500"/><path d="M7 6l2-3h6l2 3"/>'
};
const ico = n => `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[n]}</svg>`;
const MENU = ['Overview', 'Approvals', 'Bookings', 'Owner payments', 'Pricing', 'Destinations', 'Programs', 'States', 'Districts', 'Resorts', 'Activities', 'Hero cards', 'Famous places', 'Home sections', 'All resorts', 'Filter options', 'Comments', 'Bugs', 'Owners'];
const states = () => { const m = new Map(); A.places.forEach(p => { const k = p.state.trim(); (m.get(k) || m.set(k, []).get(k)).push(p); }); return [...m.entries()].sort((x, y) => x[0].localeCompare(y[0])); };

function lockNav() { document.body.style.overflow = ''; document.body.classList.toggle('navlock', !!A.nav && innerWidth < 900); }
addEventListener('resize', lockNav);
function render() {
  lockNav();
  const n = s => A.L.filter(x => x.status === s).length, dp = A.dests.filter(d => d.status === 'pending').length;
  const badge = { Approvals: n('pending'), Destinations: dp, Programs: A.progs.filter(x => x.status === 'pending').length, Bugs: A.bugs.filter(b => b.status === 'open').length, Bookings: (typeof M !== 'undefined' && M.loaded) ? M.B.filter(b => b.status === 'Pending').length : 0 }, cnt = { States: states().length, Districts: A.places.length, Resorts: A.L.filter(l => l.kind === 'stay').length, Activities: A.L.filter(l => l.kind === 'activity').length, 'Hero cards': A.hero.length, 'Famous places': A.famous.length, Comments: A.cm.length, Owners: A.owners.length };
  const nav = MENU.map(t => `<button data-t="${t}" class="${t === A.tab ? 'on' : ''}">${ico(t)}<span>${t}</span>${badge[t] ? `<i class="abd">${badge[t]}</i>` : cnt[t] != null ? `<em>${cnt[t]}</em>` : ''}</button>`).join('');
  app.innerHTML = `<header class="ah"><div class="in"><div class="brand"><button class="amb" id="mb" aria-label="Menu"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button><span class="mk"></span>Verdane <small>Admin</small></div><div class="ar"><span class="sub">${esc(A.user.email)}</span><button class="btn o sm" id="lo">Log out</button></div></div></header>
<div class="ash${A.nav ? ' open' : ''}"><div class="asd"><div class="asx"><b>Menu</b><button id="mb2" aria-label="Close menu">&times;</button></div><div class="asn">${nav}</div></div><div class="ask"></div>
<div class="amn"><h2>${A.tab}</h2><div id="pn"></div></div></div>`;
  panel();
}

const isBanned = o => !!o.banned_until && new Date(o.banned_until) > new Date();
const banInfo = o => isBanned(o) ? `<div><span class="tag no">Banned</span><span class="sub">until ${new Date(o.banned_until).toLocaleDateString()} · ${Math.ceil((new Date(o.banned_until) - Date.now()) / 864e5)} day(s) left${o.ban_reason ? ' · ' + esc(o.ban_reason) : ''}</span></div>` : '';
function banBox(id) {
  const o = A.owners.find(x => x.id === id); if (!o) return;
  modal('Ban owner', `<p class="sub" style="margin-bottom:10px"><b>${esc(o.business_name || o.email)}</b> will not be able to log in or add/change listings until the ban ends.</p><form id="bnf" novalidate><label>Number of days<input id="bnd" type="number" min="1" max="3650" step="1" inputmode="numeric" placeholder="e.g. 7" required></label><div class="err" id="bne"></div><label style="margin-top:10px">Reason (optional)<input id="bnr" maxlength="200" placeholder="Shown to the owner when they try to log in"></label><div class="row"><button class="btn d">Ban account</button><button type="button" class="btn o" onclick="dlg.close()">Cancel</button></div></form>`);
  $('#bnf').onsubmit = async e => {
    e.preventDefault(); const d = +$('#bnd').value;
    if (!Number.isInteger(d) || d < 1 || d > 3650) { $('#bne').textContent = 'Enter the number of days (1 to 3650)'; return; }
    try { chk(await SB.rpc('admin_ban_owner', { p_owner: id, p_days: d, p_reason: $('#bnr').value.trim() })); } catch (err) { return toast(/function|banned_until/i.test(err.message || '') ? 'Run the latest supabase/schema.sql first' : err.message); }
    dlg.close(); await loadAll(); panel(); toast(`Owner banned for ${d} day${d === 1 ? '' : 's'}`);
  };
}
const row = (l, acts) => `<div class="bk"><div class="im" style="background-image:url('${esc((l.photos || [])[0] || '')}')"></div><div class="in"><span class="tag ${tagCls(l.status)}">${ST[l.status]}</span><span class="tag">${l.kind === 'stay' ? 'Stay' : 'Activity'}</span><h3>${esc(l.name)}</h3><div class="sub">${placeTxt(l)} · ${esc(l.category)} · ${money(l.price)}<br>By ${esc(l.profiles?.business_name || '—')} · ${esc(l.profiles?.phone || '')}</div><div class="row"><button class="btn g sm" data-a="view" data-id="${l.id}">Review</button>${acts}</div></div></div>`;
const btn = (a, id, label, cls = '') => `<button class="btn ${cls} sm" data-a="${a}" data-id="${id}">${label}</button>`;
const acts = l => l.status === 'pending' ? btn('ok', l.id, 'Approve') + btn('no', l.id, 'Reject', 'd')
  : l.status === 'published' ? btn('un', l.id, 'Unpublish', 'o') + btn('del', l.id, 'Delete', 'd')
  : btn('ok', l.id, 'Approve') + btn('del', l.id, 'Delete', 'd');

function panel() {
  const el = $('#pn');
  if (A.tab === 'Overview') {
    const n = k => A.L.filter(x => x.status === k).length, dp = A.dests.filter(d => d.status === 'pending').length;
    el.innerHTML = `<div class="stg">${[['Pending', n('pending'), 'Approvals'], ['Published', n('published'), 'Listings'], ['Rejected', n('rejected'), 'Listings'], ['States', states().length, 'States'], ['Districts', A.places.length, 'Districts'], ['Resorts', A.L.filter(l => l.kind === 'stay').length, 'Resorts'], ['Activities', A.L.filter(l => l.kind === 'activity').length, 'Activities'], ['Owners', A.owners.length, 'Owners'], ['New destinations', dp, 'Destinations'], ['New programs', A.progs.filter(x => x.status === 'pending').length, 'Programs'], ['Bookings', (typeof M !== 'undefined' && M.loaded) ? M.B.length : '—', 'Bookings'], ['Owners to pay', (typeof M !== 'undefined' && M.loaded) ? M.B.length && ownerIds().filter(i => ownerStats(i).due > 0.5).length : '—', 'Owner payments']].map(([a, b, t]) => `<button class="stc" ${t === 'Listings' ? '' : `data-t="${t}"`}><span>${a}</span><b>${b}</b></button>`).join('')}</div>`;
  } else if (A.tab === 'Approvals') {
    const L = A.L.filter(x => x.status === 'pending');
    el.innerHTML = L.length ? `<div class="lst">${L.map(l => row(l, acts(l))).join('')}</div>` : '<div class="empty"><h3>All caught up</h3><p>No listings are waiting for approval.</p></div>';
  } else if (A.tab === 'Resorts' || A.tab === 'Activities') {
    el.innerHTML = `<form class="hsr" onsubmit="return false">${SRCH}<input id="aq" placeholder="Search ${A.tab.toLowerCase()} by name, place or owner" value="${esc(A.q)}" autocomplete="off"></form>
<div class="hch" style="margin:12px 0">${[['all', 'All'], ['pending', 'Pending'], ['published', 'Published'], ['rejected', 'Rejected']].map(([v, l]) => `<button type="button" data-fl="${v}" class="${A.f === v ? 'on' : ''}">${l}</button>`).join('')}</div><div class="lst" id="lst"></div>`;
    $('#aq').oninput = e => { A.q = e.target.value; list(); }; list();
  } else if (A.tab === 'Destinations') {
    const D = A.dests.filter(d => A.df === 'all' || d.status === A.df);
    el.innerHTML = `<p class="sub" style="margin-bottom:10px">Destinations suggested by visitors with the + button. Approved ones appear in Popular destinations on the site.</p><div class="hch" style="margin:0 0 12px">${[['pending', 'Pending'], ['published', 'Published'], ['rejected', 'Rejected'], ['all', 'All']].map(([v, l]) => `<button type="button" data-fd="${v}" class="${A.df === v ? 'on' : ''}">${l}</button>`).join('')}</div>${D.length ? `<div class="lst">${D.map(drow).join('')}</div>` : '<div class="empty"><p>No destinations here.</p></div>'}`;
  } else if (A.tab === 'Programs') {
    const D = A.progs.filter(d => A.pf === 'all' || d.status === A.pf);
    el.innerHTML = `<p class="sub" style="margin-bottom:10px">Programs suggested by visitors with the + button under Today's programs. Check the date, the Free / Paid entry and the venue, then approve. Approved programs show on Home on their program date.</p><div class="hch" style="margin:0 0 12px">${[['pending', 'Pending'], ['published', 'Published'], ['rejected', 'Rejected'], ['all', 'All']].map(([v, l]) => `<button type="button" data-fp="${v}" class="${A.pf === v ? 'on' : ''}">${l}</button>`).join('')}</div>${D.length ? `<div class="lst">${D.map(prow).join('')}</div>` : '<div class="empty"><p>No programs here.</p></div>'}`;
  } else if (A.tab === 'Bookings') {
    bookingsPanel(el);
  } else if (A.tab === 'Owner payments') {
    paymentsPanel(el);
  } else if (A.tab === 'Pricing') {
    pricingPanel(el);
  } else if (A.tab === 'Hero cards') {
    heroPanel(el);
  } else if (A.tab === 'Famous places') {
    famPanel(el);
  } else if (A.tab === 'Filter options') {
    optPanel(el);
  } else if (A.tab === 'Home sections') {
    featPanel(el);
  } else if (A.tab === 'All resorts') {
    bestPanel(el);
  } else if (A.tab === 'Bugs') {
    bugPanel(el);
  } else if (A.tab === 'Comments') {
    cmPanel(el);
  } else if (A.tab === 'States') {
    const S = states();
    el.innerHTML = `<p class="sub" style="margin-bottom:10px">States the site covers. Edit a state to add its photos (up to 3), description or a new name; renaming updates all its districts. Deleting a state also deletes everything inside it.</p><button class="btn g sm" style="margin:0 0 18px" data-a="ast">+ Add state</button>
${S.length ? S.map(([st, ps]) => { const ids = ps.map(p => p.id), c = A.L.filter(l => ids.includes(l.place_id)).length, sr = A.states.find(x => x.name.toLowerCase() === st.toLowerCase()), ph = ((sr && sr.photos) || [])[0] || ps.flatMap(p => p.photos || [])[0]; return `<div class="bk"><div class="im" style="background-image:url('${esc(ph || '')}')"></div><div class="in"><h3>${esc(st)}</h3><div class="sub">${ps.length} district${ps.length === 1 ? '' : 's'} · ${c} listing${c === 1 ? '' : 's'}<br>${ps.map(p => esc(p.city)).join(', ')}</div><div class="row">${btn('adp', '', '+ District', 'g').replace('data-id=""', `data-st="${esc(st)}"`)}${btn('est', '', 'Edit', 'o').replace('data-id=""', `data-st="${esc(st)}"`)}${btn('dst', '', 'Delete', 'd').replace('data-id=""', `data-st="${esc(st)}"`)}</div></div></div>`; }).join('') : '<div class="empty"><p>No states yet. Add the first one above.</p></div>'}`;
  } else if (A.tab === 'Districts') {
    const q = A.q.toLowerCase(), P = A.places.filter(p => `${p.city} ${p.state}`.toLowerCase().includes(q));
    el.innerHTML = `<p class="sub" style="margin-bottom:10px">Add the districts the site covers. Owners and visitors can add stays, activities and destinations only inside these districts, and the site shows nothing else. Photos you add appear on the state card, the district card and the district page.</p><button class="btn g sm" style="margin:0 0 14px" data-a="addp">+ Add district</button>
<form class="hsr" onsubmit="return false">${SRCH}<input id="aq" placeholder="Search district or state" value="${esc(A.q)}" autocomplete="off"></form><div style="height:12px"></div>
${P.length ? P.map(p => { const c = A.L.filter(l => l.place_id === p.id).length, n = (p.photos || []).length; return `<div class="sum"><div><b>${esc(p.city)}, ${esc(p.state)}</b><span class="sub">${c} listing${c === 1 ? '' : 's'} · ${n} photo${n === 1 ? '' : 's'}</span></div><div><span></span><span class="row" style="margin:0">${btn('ep', p.id, 'Edit', 'o')}${btn('dp', p.id, 'Delete', 'd')}</span></div></div>`; }).join('') : '<div class="empty"><p>No districts found.</p></div>'}`;
    $('#aq').oninput = e => { A.q = e.target.value; const x = e.target.selectionStart; panel(); const i = $('#aq'); i.focus(); i.setSelectionRange(x, x); };
  } else {
    el.innerHTML = A.owners.length ? A.owners.map(o => { const n = A.L.filter(l => l.owner_id === o.id); return `<div class="sum"><div><b>${esc(o.business_name || '—')}</b><span class="sub">${n.length} listing${n.length === 1 ? '' : 's'} · ${n.filter(x => x.status === 'published').length} live</span></div><div><span class="sub">${esc(o.email)}</span><span class="sub">${esc(o.phone)}</span></div>${banInfo(o)}<div class="row" style="margin-top:8px">${isBanned(o) ? btn('ban', o.id, 'Change ban', 'o') + btn('unban', o.id, 'Lift ban', 'g') : btn('ban', o.id, 'Ban owner', 'd')}</div></div>`; }).join('') : '<div class="empty"><p>No owners have signed up yet.</p></div>';
  }
}
/* ---------- Bugs: reports sent from the footer "Report a bug" button ---------- */
function bugPanel(el) {
  const B = A.bugs.filter(b => A.bf === 'all' || b.status === A.bf), nOpen = A.bugs.filter(b => b.status === 'open').length;
  const mail = b => `mailto:${encodeURIComponent(b.contact)}?subject=${encodeURIComponent('Re: your bug report on Verdane (#' + b.id.slice(0, 6).toUpperCase() + ')')}&body=${encodeURIComponent('Hi,\n\nThanks for reporting this issue:\n"' + b.message + '"\n\n')}`;
  const card = b => { const open = b.status === 'open', d = new Date(b.created_at);
    return `<article class="bug ${open ? 'is-open' : 'is-done'}">
<header><div class="bug-id">#${b.id.slice(0, 6).toUpperCase()}</div><span class="tag ${open ? 'wait' : 'ok'}">${open ? 'Open' : 'Resolved'}</span><time class="sub" datetime="${esc(b.created_at)}">${d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })} · ${d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</time></header>
<div class="bug-who"><span class="bug-av">${esc((b.contact || '?')[0].toUpperCase())}</span><div><small>Reported by</small><a href="${esc(mail(b))}">${esc(b.contact || '—')}</a></div></div>
<div class="bug-msg"><small>Report</small><p>${esc(b.message)}</p></div>
<dl class="bug-meta"><div><dt>Page</dt><dd>${esc(b.page || '—')}</dd></div><div><dt>Device</dt><dd title="${esc(b.user_agent)}">${esc(b.user_agent || '—')}</dd></div></dl>
<div class="bug-act">${b.contact ? `<a class="btn o sm" href="${esc(mail(b))}">Reply by email</a>` : ''}${btn('bgst', b.id, open ? 'Mark resolved' : 'Reopen', open ? 'g' : 'o')}${btn('bgdel', b.id, 'Delete', 'd')}</div></article>`; };
  el.innerHTML = `<div class="bug-stats"><div><b>${A.bugs.length}</b><span>Total reports</span></div><div class="w"><b>${nOpen}</b><span>Open</span></div><div class="g"><b>${A.bugs.length - nOpen}</b><span>Resolved</span></div></div>
<p class="sub" style="margin:0 0 12px">Problems reported by visitors from the site footer. Reply to the reporter by email, then mark the bug resolved.</p>
<div class="hch" style="margin:0 0 14px">${[['open', 'Open'], ['resolved', 'Resolved'], ['all', 'All']].map(([v, l]) => `<button type="button" data-fb="${v}" class="${A.bf === v ? 'on' : ''}">${l}</button>`).join('')}</div>
${B.length ? `<div class="bug-grid">${B.map(card).join('')}</div>` : '<div class="empty"><h3>No bugs here</h3><p>Reports sent from the site footer will appear in this list.</p></div>'}`;
}
/* ---------- Comments on destinations: admin can remove any (rude / 18+ / spam) ---------- */
function cmPanel(el) {
  const q = A.cq.trim().toLowerCase(), G = new Map();
  A.cm.forEach(c => { if (q && !(c.name + ' ' + c.body + ' ' + ((c.destinations || {}).name || '')).toLowerCase().includes(q)) return; (G.get(c.dest_id) || G.set(c.dest_id, []).get(c.dest_id)).push(c); });
  const card = ([id, L]) => { const d = A.dests.find(x => x.id === id) || A.L.find(x => x.id === id) || {}, dn = d.name || (L[0].destinations || {}).name || (L[0].destinations || {}).city || 'Destination', ph = (d.photos || [])[0] || d.photo || '';
    return `<div class="bk" style="flex-direction:column;align-items:stretch"><div style="display:flex;gap:12px;align-items:center;margin-bottom:10px"><div class="im" style="background-image:url('${esc(ph)}');width:76px;height:60px;min-height:60px;flex:0 0 76px;border-radius:12px;background-size:cover;background-position:center"></div><div><h3 style="margin:0">${esc(dn)}</h3><div class="sub">${esc([d.city, d.state].filter(Boolean).join(', '))} · ${L.length} comment${L.length === 1 ? '' : 's'}</div></div></div>
${L.map(c => `<div style="background:#f4f4f1;border-radius:12px;padding:10px 12px;margin-top:8px"><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><b>${esc(c.name)}</b><span class="sub">${new Date(c.created_at).toLocaleString()}</span></div><p style="margin:4px 0 8px;white-space:pre-wrap;word-break:break-word">${esc(c.body)}</p>${btn('cmdel', c.id, 'Remove comment', 'd')}</div>`).join('')}</div>`; };
  el.innerHTML = `<p class="sub" style="margin-bottom:10px">Each card is a destination, stay or activity with all its comments inside. One comment per device per card. Remove anything rude, adult (18+) or spam: it disappears for everyone straight away.</p>
<input id="cmq" placeholder="Search comments, names or destinations" value="${esc(A.cq)}" style="margin-bottom:12px">
${G.size ? `<div class="lst">${[...G.entries()].map(card).join('')}</div>` : '<div class="empty"><p>No comments yet.</p></div>'}`;
  $('#cmq').oninput = e => { A.cq = e.target.value; const pos = e.target.selectionStart; cmPanel(el); const i = $('#cmq'); i.focus(); i.setSelectionRange(pos, pos); };
}
/* ---------- Home sections: choose which stays / activities the Home page shows, per district ---------- */
function featPanel(el) {
  if (!A.places.length) { el.innerHTML = '<div class="empty"><p>Add a district first (Districts page).</p></div>'; return; }
  if (!A.places.some(p => p.id === A.hp)) A.hp = A.places[0].id;
  const P = A.places.find(p => p.id === A.hp), inP = k => A.L.filter(l => l.place_id === A.hp && l.kind === k && l.status === 'published');
  const sec = (k, title) => { const L = inP(k), n = L.filter(l => l.home_featured).length;
    return `<h3 style="margin:22px 0 4px">${title} <span class="sub">· ${n} chosen</span></h3><p class="sub" style="margin:0 0 10px">${n ? 'Home shows only the chosen ones, in this order.' : 'None chosen: Home shows the top rated ones.'}</p>
${L.length ? `<div class="lst">${L.map(l => `<div class="bk"><div class="im" style="background-image:url('${esc((l.photos || [])[0] || '')}')"></div><div class="in"><span class="tag ${l.home_featured ? 'ok' : ''}">${l.home_featured ? 'On Home' : 'Not on Home'}</span><h3>${esc(l.name)}</h3><div class="sub">${money(l.price)} · ★ ${(+l.rating).toFixed(1)}</div><div class="row" style="margin-top:8px">${btn('ft', l.id, l.home_featured ? 'Remove from Home' : 'Show on Home', l.home_featured ? 'o' : '')}</div></div></div>`).join('')}</div>` : `<div class="empty"><p>No published ${k === 'stay' ? 'stays' : 'activities'} in ${esc(P.city)} yet.</p></div>`}`; };
  el.innerHTML = `<p class="sub" style="margin-bottom:10px">Choose which cards appear in the Stays and Activities sections of the Home page. Pick a district, then switch cards on or off. Visitors in that district (or who pick it) see your choice.</p>
<label class="hp">District<select id="hps">${A.places.map(p => `<option value="${p.id}"${p.id === A.hp ? ' selected' : ''}>${esc(p.city)}, ${esc(p.state)}</option>`).join('')}</select></label>
${sec('stay', 'Stays section')}${sec('activity', 'Activities section')}`;
  $('#hps').onchange = e => { A.hp = e.target.value; panel(); };
}
/* ---------- All resorts: per district, choose up to 10 resorts for the Home \"Best resorts\" cards ---------- */
const BEST_MAX = 10;
function bestPanel(el) {
  if (!A.places.length) { el.innerHTML = '<div class="empty"><p>Add a district first (Districts page).</p></div>'; return; }
  if (!A.places.some(p => p.id === A.hp)) A.hp = A.places[0].id;
  const P = A.places.find(p => p.id === A.hp), L = A.L.filter(l => l.place_id === A.hp && l.kind === 'stay' && l.status === 'published').sort((a, b) => (b.home_best - a.home_best) || (b.rating - a.rating)), n = L.filter(l => l.home_best).length;
  el.innerHTML = `<p class="sub" style="margin-bottom:10px">Every published resort of the district is listed here. Choose up to ${BEST_MAX} for the <b>Best resorts</b> cards on the Home page. Visitors tap <b>View all</b> to see all of them.</p>
<label class="hp">District<select id="bps">${A.places.map(p => `<option value="${p.id}"${p.id === A.hp ? ' selected' : ''}>${esc(p.city)}, ${esc(p.state)}</option>`).join('')}</select></label>
<h3 style="margin:22px 0 4px">All resorts <span class="sub">· ${L.length} in ${esc(P.city)} · ${n} / ${BEST_MAX} chosen</span></h3><p class="sub" style="margin:0 0 10px">${n ? 'Home shows only the chosen ones.' : 'None chosen: Home shows the top rated resorts.'}</p>
${L.length ? `<div class="lst">${L.map(l => `<div class="bk"><div class="im" style="background-image:url('${esc((l.photos || [])[0] || '')}')"></div><div class="in"><span class="tag ${l.home_best ? 'ok' : ''}">${l.home_best ? 'In Best resorts' : 'Not chosen'}</span><h3>${esc(l.name)}</h3><div class="sub">${money(l.price)} · ★ ${(+l.rating).toFixed(1)} · ${esc(l.profiles?.business_name || '—')}</div><div class="row" style="margin-top:8px">${btn('bst', l.id, l.home_best ? 'Remove from Best resorts' : 'Add to Best resorts', l.home_best ? 'o' : '')}</div></div></div>`).join('')}</div>` : `<div class="empty"><p>No published resorts in ${esc(P.city)} yet.</p></div>`}`;
  $('#bps').onchange = e => { A.hp = e.target.value; panel(); };
}
async function toggleBest(id) {
  const l = A.L.find(x => x.id === id); if (!l) return;
  if (!l.home_best && A.L.filter(x => x.place_id === l.place_id && x.kind === 'stay' && x.home_best).length >= BEST_MAX) return toast(`Maximum ${BEST_MAX} resorts per district. Remove one first.`);
  const { error } = await SB.from('listings').update({ home_best: !l.home_best }).eq('id', id);
  if (error) return toast(/home_best/.test(error.message) && !/maximum/i.test(error.message) ? 'Run the latest supabase/schema.sql first' : error.message);
  await loadAll(); panel(); toast(l.home_best ? 'Removed from Best resorts' : 'Added to Best resorts');
}
async function toggleFeat(id) {
  const l = A.L.find(x => x.id === id); if (!l) return;
  const { error } = await SB.from('listings').update({ home_featured: !l.home_featured }).eq('id', id);
  if (error) return toast(/home_featured/.test(error.message) ? 'Run the latest supabase/schema.sql first' : error.message);
  await loadAll(); panel(); toast(l.home_featured ? 'Removed from Home' : 'Now shown on Home');
}

/* ---------- hero cards (home page top cards, one set per district) ---------- */
function heroPanel(el) {
  if (!A.places.length) { el.innerHTML = '<div class="empty"><p>Add a district first (Districts page).</p></div>'; return; }
  if (A.hp !== 'all' && !A.places.some(p => p.id === A.hp)) A.hp = A.places[0].id;
  const ALL = A.hp === 'all', P = ALL ? { city: 'all districts' } : A.places.find(p => p.id === A.hp), H = A.hero.filter(h => (ALL ? !h.place_id : h.place_id === A.hp));
  el.innerHTML = `<p class="sub" style="margin-bottom:10px">The big swipe cards at the top of Home. Choose a district, then add its cards. Visitors who pick that district (or whose live location is in it) see these cards; with no district chosen they see all cards. Choose <b>All districts</b> to add a card that every visitor sees, whatever district they are in (it comes after that district's own cards). A district without any cards shows its top stays instead.</p>
<label class="hp">District<select id="hps"><option value="all"${ALL ? ' selected' : ''}>★ All districts (shown to every user) (${A.hero.filter(h => !h.place_id).length})</option>${A.places.map(p => `<option value="${p.id}"${!ALL && p.id === A.hp ? ' selected' : ''}>${esc(p.city)}, ${esc(p.state)} (${A.hero.filter(h => h.place_id === p.id).length})</option>`).join('')}</select></label>
<button class="btn g sm" style="margin:14px 0 18px" data-a="addh">+ Add card for ${esc(P.city)}</button>
${H.length ? `<div class="lst">${H.map(h => `<div class="bk"><div class="im" style="background-image:url('${esc(h.photo)}')"></div><div class="in"><span class="tag ${h.active ? 'ok' : 'no'}">${h.active ? 'Showing' : 'Hidden'}</span>${h.tag ? `<span class="tag">${esc(h.tag)}</span>` : ''}<h3>${esc(h.title)}</h3><div class="sub">${esc(h.subtitle || '')}${h.listing_id ? `<br>Opens: ${esc((A.L.find(l => l.id === h.listing_id) || {}).name || 'listing')}` : '<br>Opens the district page'}</div><div class="row">${btn('eh', h.id, 'Edit', 'o')}${btn('th', h.id, h.active ? 'Hide' : 'Show', 'o')}${btn('dh', h.id, 'Delete', 'd')}</div></div></div>`).join('')}</div>` : `<div class="empty"><p>No cards for ${ALL ? 'all districts' : 'this district'} yet.</p></div>`}`;
  $('#hps').onchange = e => { A.hp = e.target.value; panel(); };
}

/* ---------- Famous places: choose State or District, then tick destination cards (the Popular destinations cards) ---------- */
const famScope = () => { const F = A.fm; return F.mode === 'district' ? (F.pid ? A.places.find(p => p.id === F.pid) || null : null) : null; };
const famMine = (d, P) => A.famous.find(f => f.destination_id === d.id && (P ? f.place_id === P.id : !f.place_id));
function famPanel(el) {
  const S_ = states(), F = A.fm;
  if (!S_.length) { el.innerHTML = '<div class="empty"><p>Add a state and a district first (States page).</p></div>'; return; }
  if (!S_.some(([n]) => n === F.st)) F.st = '';
  const dist = F.st ? A.places.filter(p => p.state === F.st).sort((a, b) => a.city.localeCompare(b.city)) : [];
  if (F.mode === 'district' && !dist.some(p => p.id === F.pid)) F.pid = '';
  const P = famScope(), ready = F.mode === 'state' ? !!F.st : !!P, target = F.mode === 'state' ? F.st : (P ? `${P.city}, ${P.state}` : '');
  const chip = (k, v, label, n, cur) => `<button type="button" data-fm="${k}" data-v="${esc(v)}" class="${v === cur ? 'on' : ''}">${esc(label)}${n != null ? ` (${n})` : ''}</button>`;
  const stN = n => A.famous.filter(f => !f.place_id && f.state === n).length, dsN = id => A.famous.filter(f => f.place_id === id).length;
  const D = !ready ? [] : A.dests.filter(d => d.status === 'published' && (P ? d.place_id === P.id : d.state === F.st))
    .sort((x, y) => { const a = famMine(x, P), b = famMine(y, P); return (a ? 0 : 1) - (b ? 0 : 1) || (a && b ? a.sort - b.sort : 0); });
  const n = D.filter(d => famMine(d, P)).length;
  el.innerHTML = `<p class="sub" style="margin-bottom:12px">Choose where the <b>Famous destinations</b> row should appear (a <b>State</b> page or a <b>District</b> page), then select cards from that place's destinations. Only approved destination cards can be chosen.</p>
<p class="hlb" style="margin:0 0 6px">Add to</p><div class="hch" style="margin-bottom:14px">${chip('mode', 'state', 'State', null, F.mode)}${chip('mode', 'district', 'District', null, F.mode)}</div>
<p class="hlb" style="margin:0 0 6px">${F.mode === 'state' ? 'Select a state' : 'Step 1: select a state'}</p><div class="hch" style="margin-bottom:14px">${S_.map(([nm]) => chip('st', nm, nm, F.mode === 'state' ? stN(nm) : null, F.st)).join('')}</div>
${F.mode === 'district' ? (F.st ? `<p class="hlb" style="margin:0 0 6px">Step 2: select a district in ${esc(F.st)}</p><div class="hch" style="margin-bottom:14px">${dist.map(p => chip('pid', p.id, p.city, dsN(p.id), F.pid)).join('')}</div>` : '<p class="sub" style="margin-bottom:14px">Select a state to see its districts.</p>') : ''}
${ready ? `<h3 style="margin:18px 0 4px">Destination cards · ${esc(target)} <span class="sub">· ${n} selected</span></h3><p class="sub" style="margin:0 0 10px">${n ? 'Selected cards show in the Famous destinations row, in this order.' : 'None selected: the row stays hidden.'}</p>
${D.length ? `<div class="lst">${D.map(d => { const on = !!famMine(d, P); return `<div class="bk"><div class="im" style="background-image:url('${esc((d.photos && d.photos[0]) || d.photo || '')}')"></div><div class="in"><span class="tag ${on ? 'ok' : ''}">${on ? 'Famous' : 'Not selected'}</span><span class="tag">${esc(d.type)}</span><h3>${esc(d.name || d.city)}</h3><div class="sub">${esc(d.city)}, ${esc(d.state)}</div><div class="row">${btn('fsel', d.id, on ? 'Remove from Famous' : 'Add to Famous', on ? 'o' : '')}${btn('fdel', d.id, 'Delete', 'd')}</div></div></div>`; }).join('')}</div>` : `<div class="empty"><p>No approved destination cards in ${esc(target)} yet. Approve visitor destinations in the Destinations tab first.</p></div>`}` : ''}`;
}
async function famToggle(id) {
  const d = A.dests.find(x => x.id === id); if (!d) return; const P = famScope(), cur = famMine(d, P);
  const { error } = cur ? await SB.from('famous_places').delete().eq('id', cur.id)
    : await SB.from('famous_places').insert({ state: d.state, place_id: P ? P.id : null, title: d.name || d.city, subtitle: d.type || '', photo: (d.photos && d.photos[0]) || d.photo, destination_id: d.id,
        sort: A.famous.filter(f => P ? f.place_id === P.id : (!f.place_id && f.state === d.state)).length });
  if (error) return toast(/famous_places/.test(error.message || '') ? 'Run the latest supabase/schema.sql first' : error.message);
  await loadAll(); render(); toast(cur ? 'Removed from Famous' : 'Added to Famous');
}

const cropHero = file => new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => { const im = new Image(); im.onload = () => {
  const W = 1200, H = 960, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'), r = Math.max(W / im.width, H / im.height), w = im.width * r, h = im.height * r;
  x.drawImage(im, (W - w) / 2, (H - h) / 2, w, h); res(c.toDataURL('image/jpeg', .82)); }; im.onerror = rej; im.src = fr.result; }; fr.onerror = rej; fr.readAsDataURL(file); });

function heroForm(id) {
  const ALL = A.hp === 'all', h = id ? A.hero.find(x => x.id === id) : null, P = ALL ? { city: 'All districts' } : A.places.find(p => p.id === A.hp); let ph = h ? h.photo : '';
  const opts = A.L.filter(l => (ALL || l.place_id === A.hp) && l.status === 'published');
  modal(h ? 'Edit card' : `New card · ${esc(P.city)}`, `<form id="hf" novalidate>
<p class="sub" style="margin:0 0 8px"><b>Photo</b> · upload a landscape photo, <b>1200 × 960 px (5:4)</b>, under 8 MB. It is cropped to the card shape automatically.</p><label class="hpv" id="hsl"><input type="file" accept="image/*" id="hfile" style="display:none"><span>Choose photo</span></label><div class="err" id="e_hp"></div>
<div class="two" style="margin-top:12px"><div><label>Title<input id="ht" maxlength="80" value="${esc(h?.title || '')}" autocomplete="off"></label><div class="err" id="e_ht"></div></div><div><label>Badge (optional)<input id="hg" maxlength="30" value="${esc(h?.tag || '')}" placeholder="e.g. Featured" autocomplete="off"></label></div></div>
<label style="margin-top:12px">Subtitle (optional)<input id="hs" maxlength="120" value="${esc(h?.subtitle || '')}" autocomplete="off"></label>
<label style="margin-top:12px">When tapped, open<select id="hl"><option value="">${ALL ? 'Nothing (just show the card)' : `The ${esc(P.city)} district page`}</option>${opts.map(l => `<option value="${l.id}"${h?.listing_id === l.id ? ' selected' : ''}>${l.kind === 'stay' ? 'Resort' : 'Activity'}: ${esc(l.name)}</option>`).join('')}</select></label>
<div class="two" style="margin-top:12px"><label>Order (small first)<input id="ho" type="number" value="${h?.sort ?? A.hero.filter(x => (ALL ? !x.place_id : x.place_id === A.hp)).length}"></label></div>
<div class="row"><button class="btn g" id="hgo">${h ? 'Save changes' : 'Add card'}</button></div></form>`);
  const paint = () => { const l = $('#hsl'); if (ph) { l.style.backgroundImage = `url("${ph}")`; l.classList.add('set'); l.lastElementChild.textContent = 'Change photo'; } }; paint();
  $('#hfile').onchange = async e => { const f = e.target.files[0]; if (!f) return;
    if (!f.type.startsWith('image/') || f.size > 8e6) { $('#e_hp').textContent = 'Choose an image under 8 MB'; return; }
    $('#e_hp').textContent = ''; try { ph = await cropHero(f); paint(); } catch (_) { $('#e_hp').textContent = 'Could not read that image'; } };
  $('#hf').onsubmit = async e => {
    e.preventDefault(); $$('#hf .err').forEach(x => x.textContent = '');
    const title = $('#ht').value.trim(); let bad = false;
    if (title.length < 2) { $('#e_ht').textContent = 'Required'; bad = true; }
    if (!ph) { $('#e_hp').textContent = 'Add a photo'; bad = true; }
    if (bad) return;
    const b = $('#hgo'); b.disabled = true; b.textContent = 'Saving…';
    try {
      const cid = id || crypto.randomUUID(); let url = ph;
      if (ph.startsWith('data:')) {
        url = await CLOUD.uploadPhoto(ph, 'hero', SB);
      }
      const row = { place_id: ALL ? null : A.hp, title, tag: $('#hg').value.trim(), subtitle: $('#hs').value.trim(), photo: url, listing_id: $('#hl').value || null, sort: parseInt($('#ho').value, 10) || 0 };
      const { error } = await (id ? SB.from('hero_cards').update(row).eq('id', id) : SB.from('hero_cards').insert({ id: cid, ...row }));
      if (error) throw error;
      dlg.close(); await loadAll(); render(); toast(id ? 'Card updated' : 'Card added');
    } catch (err) { b.disabled = false; b.textContent = id ? 'Save changes' : 'Add card'; toast(err.message || 'Could not save'); }
  };
}

function list() {
  const q = A.q.toLowerCase();
  const kind = A.tab === 'Resorts' ? 'stay' : 'activity';
  const L = A.L.filter(l => l.kind === kind && (A.f === 'all' || l.status === A.f) && `${l.name} ${l.places?.city} ${l.places?.state} ${l.profiles?.business_name}`.toLowerCase().includes(q));
  $('#lst').innerHTML = L.length ? L.map(l => row(l, acts(l))).join('') : `<div class="empty"><p>No ${A.tab.toLowerCase()} found.</p></div>`;
}

const dacts = d => d.status === 'pending' ? btn('dok', d.id, 'Approve') + btn('dno', d.id, 'Reject', 'd') + btn('ddel', d.id, 'Delete', 'd')
  : d.status === 'published' ? btn('dun', d.id, 'Unpublish', 'o') + btn('ddel', d.id, 'Delete', 'd')
  : btn('dok', d.id, 'Approve') + btn('ddel', d.id, 'Delete', 'd');
const drow = d => `<div class="bk"><div class="im" style="background-image:url('${esc(d.photo)}')"></div><div class="in"><span class="tag ${tagCls(d.status)}">${ST[d.status]}</span><span class="tag">${esc(d.type)}</span><h3>${esc(d.name || d.city)}</h3><div class="sub">${esc(d.city)}, ${esc(d.state)} · ${esc(d.location)}</div><div class="row"><button class="btn g sm" data-a="dview" data-id="${d.id}">Review</button>${dacts(d)}</div></div></div>`;

const pacts = d => d.status === 'pending' ? btn('pok', d.id, 'Approve') + btn('pno', d.id, 'Reject', 'd') + btn('pdel', d.id, 'Delete', 'd')
  : d.status === 'published' ? btn('pun', d.id, 'Unpublish', 'o') + btn('pdel', d.id, 'Delete', 'd')
  : btn('pok', d.id, 'Approve') + btn('pdel', d.id, 'Delete', 'd');
const pdate = d => new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const pentry = d => d.is_free ? 'Free' : money(d.price);
const prow = d => `<div class="bk"><div class="im" style="background-image:url('${esc(d.photo)}')"></div><div class="in"><span class="tag ${tagCls(d.status)}">${ST[d.status]}</span><span class="tag">${esc(pdate(d.program_date))}</span><span class="tag">${esc(pentry(d))}</span><h3>${esc(d.name)}</h3><div class="sub">${esc(d.city)}, ${esc(d.state)} · ${esc(d.location)}</div><div class="row"><button class="btn g sm" data-a="pview" data-id="${d.id}">Review</button>${pacts(d)}</div></div></div>`;

/* ---------- actions ---------- */
function review(id) {
  const l = A.L.find(x => x.id === id); if (!l) return;
  const t = (l.types || []).map(x => `<div><span>${esc(x.name)}</span><b>${money(x.price)}</b></div>`).join('');
  modal(esc(l.name), `<div class="ph3">${(l.photos || []).map(u => `<div style="background-image:url('${esc(u)}')"></div>`).join('') || '<span class="sub">No photos</span>'}</div>
<div class="sum"><div><span>Status</span><span class="tag ${tagCls(l.status)}">${ST[l.status]}</span></div><div><span>Type</span><span>${l.kind === 'stay' ? 'Stay' : 'Activity'} · ${esc(l.category)}</span></div><div><span>Place</span><span>${placeTxt(l)}</span></div><div><span>Owner</span><span>${esc(l.profiles?.business_name || '—')}</span></div><div><span>Contact</span><span>${esc(l.profiles?.phone || '')} ${esc(l.profiles?.email || '')}</span></div>${l.kind === 'stay' ? `<div><span>Rooms / guests</span><span>${l.rooms} / ${l.capacity}</span></div>` : `<div><span>Duration</span><span>${esc(l.duration || '')}</span></div>`}</div>
<h3>${l.kind === 'stay' ? 'Room types' : 'Ticket types'}</h3><div class="sum">${t}</div>${l.kind === 'stay' ? `<p>${(l.amenities || []).map(a => `<span class="tag">${esc(a)}</span>`).join('')}</p>` : ''}<p style="margin-top:10px">${esc(l.description)}</p>${l.review_note ? `<p class="sub">Last note: ${esc(l.review_note)}</p>` : ''}
<div class="row">${l.status !== 'published' ? `<button class="btn g" data-a="ok" data-id="${l.id}">Approve</button>` : ''}${l.status !== 'rejected' ? `<button class="btn d" data-a="no" data-id="${l.id}">Reject</button>` : ''}</div>`);
}

function dreview(id) {
  const d = A.dests.find(x => x.id === id); if (!d) return;
  modal(esc(d.name || d.city), `<div class="ph3">${(d.photos && d.photos.length ? d.photos : [d.photo]).map(u => `<div style="background-image:url('${esc(u)}')"></div>`).join('')}</div>
<div class="sum"><div><span>Status</span><span class="tag ${tagCls(d.status)}">${ST[d.status]}</span></div><div><span>Type</span><span>${esc(d.type)}</span></div><div><span>State</span><span>${esc(d.state)}</span></div><div><span>District</span><span>${esc(d.city)}</span></div>${d.town ? `<div><span>Town</span><span>${esc(d.town)}</span></div><div><span>Street</span><span style="text-align:right">${esc(d.street)}</span></div>${d.landmark ? `<div><span>Landmark</span><span style="text-align:right">${esc(d.landmark)}</span></div>` : ''}` : `<div><span>Location</span><span style="text-align:right">${esc(d.location)}</span></div>`}</div>
${d.description ? `<p>${esc(d.description)}</p>` : ''}${d.review_note ? `<p class="sub">Last note: ${esc(d.review_note)}</p>` : ''}
<div class="row"><a class="btn o" style="text-decoration:none;display:inline-block" href="${esc(safeUrl(d.maps_link))}" target="_blank" rel="noopener noreferrer">Check on Google Maps</a>${((d.video_links && d.video_links.length) ? d.video_links : (d.video_url ? [d.video_url] : [])).map((u, k) => `<a class="btn o" style="text-decoration:none;display:inline-block" href="${esc(safeUrl(u))}" target="_blank" rel="noopener noreferrer">Open video ${k + 1}</a>`).join('')}${d.status !== 'published' ? `<button class="btn g" data-a="dok" data-id="${d.id}">Approve</button>` : ''}${d.status !== 'rejected' ? `<button class="btn d" data-a="dno" data-id="${d.id}">Reject</button>` : ''}</div>`);
}

function preview(id) {
  const d = A.progs.find(x => x.id === id); if (!d) return;
  modal(esc(d.name), `<div class="ph3">${(d.photos && d.photos.length ? d.photos : [d.photo]).map(u => `<div style="background-image:url('${esc(u)}')"></div>`).join('')}</div>
<div class="sum"><div><span>Status</span><span class="tag ${tagCls(d.status)}">${ST[d.status]}</span></div><div><span>Program date</span><span>${esc(pdate(d.program_date))}</span></div>${d.start_time ? `<div><span>Start time</span><span>${esc(d.start_time)}</span></div>` : ''}<div><span>Entry</span><span>${esc(pentry(d))}${d.is_free ? '' : ' per person'}</span></div><div><span>State</span><span>${esc(d.state)}</span></div><div><span>District</span><span>${esc(d.city)}</span></div><div><span>Address</span><span style="text-align:right">${esc(d.location)}</span></div>${(A.psub || {})[d.id] ? `<div><span>Added by</span><span style="text-align:right">${esc(A.psub[d.id].name)}</span></div><div><span>Phone</span><span><a href="tel:${esc(A.psub[d.id].phone)}">${esc(A.psub[d.id].phone)}</a></span></div>` : ''}</div>
${d.description ? `<p>${esc(d.description)}</p>` : ''}${d.review_note ? `<p class="sub">Last note: ${esc(d.review_note)}</p>` : ''}
<div class="row"><a class="btn o" style="text-decoration:none;display:inline-block" href="${esc(safeUrl(d.maps_link))}" target="_blank" rel="noopener noreferrer">Check on Google Maps</a>${(d.video_links || []).map((u, k) => `<a class="btn o" style="text-decoration:none;display:inline-block" href="${esc(safeUrl(u))}" target="_blank" rel="noopener noreferrer">Open video ${k + 1}</a>`).join('')}${d.status !== 'published' ? `<button class="btn g" data-a="pok" data-id="${d.id}">Approve</button>` : ''}${d.status !== 'rejected' ? `<button class="btn d" data-a="pno" data-id="${d.id}">Reject</button>` : ''}</div>`);
}
async function setProgStatus(id, status, note) {
  const { error } = await SB.from('programs').update({ status, review_note: note || null, reviewed_at: new Date().toISOString() }).eq('id', id);
  if (error) return toast(error.message);
  await loadAll(); render();
  toast({ published: 'Approved: now public', rejected: 'Rejected', pending: 'Moved back to pending' }[status]);
}

async function setDestStatus(id, status, note) {
  const { error } = await SB.from('destinations').update({ status, review_note: note || null, reviewed_at: new Date().toISOString() }).eq('id', id);
  if (error) return toast(error.message);
  await loadAll(); render();
  toast({ published: 'Approved: now public', rejected: 'Rejected', pending: 'Moved back to pending' }[status]);
}

async function setStatus(id, status, note) {
  const { error } = await SB.from('listings').update({ status, review_note: note || null, reviewed_at: new Date().toISOString() }).eq('id', id);
  if (error) return toast(error.message);
  await loadAll(); render();
  toast({ published: 'Approved: now public', rejected: 'Rejected', pending: 'Moved back to pending' }[status]);
}

function rejectBox(id, kind = 'l') {
  modal('Reject listing', `<p class="sub">Tell the owner why (optional).</p><textarea id="rn" rows="3" placeholder="e.g. Photos are unclear"></textarea><div class="row"><button class="btn d" id="rgo">Reject</button><button class="btn o" onclick="dlg.close()">Cancel</button></div>`);
  $('#rgo').onclick = async () => { const n = $('#rn').value.trim(); dlg.close(); await (kind === 'p' ? setProgStatus : kind === 'd' ? setDestStatus : setStatus)(id, 'rejected', n); };
}

const coordsFromLink = u => { const m = (u || '').match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/) || (u || '').match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/); return m ? [m[1], m[2]] : null; };

function placeForm(id, preset = '') {
  const p = id ? A.places.find(x => x.id === id) : null, ph = p ? [...(p.photos || [])] : [];
  modal(p ? 'Edit district' : 'Add district', `<form id="pf" novalidate><div class="two">${fld('pc', 'District', p?.city)}${fld('ps', 'State', p?.state ?? preset)}</div>
<p class="sub" style="margin:14px 0 8px"><b>Photos</b> · up to 3 (1 main + 2 more). Upload landscape photos, <b>960 × 540 px (16:9)</b> or larger in the same shape, under 8 MB each; they are cropped to 16:9 automatically. Optional. Shown on the state card, the district card and the district page.</p>
<div class="slots wide">${slotsHtml('sl')}</div><div class="err" id="e_pph"></div>
<div style="margin-top:12px">${fld('pv', 'Video link (YouTube, Instagram or Facebook)', p?.video_url || '', 'url', 'https://...')}</div>
<div style="margin-top:12px">${fld('pm', 'Google Maps link', p?.maps_link || '', 'url', 'https://maps.app.goo.gl/...')}</div>
<div class="two" style="margin-top:12px">${fld('pla', 'Latitude (for live location)', p?.lat ?? '', 'text', 'e.g. 9.4981')}${fld('pln', 'Longitude', p?.lng ?? '', 'text', 'e.g. 76.3388')}</div>
<p class="sub" style="margin-top:4px">Needed so a visitor's live location can find this district. Right-click the spot on Google Maps to copy the numbers. If the Maps link above contains them, they are filled in automatically.</p>
<label style="margin-top:12px">Description<textarea id="pd" rows="3" maxlength="600">${esc(p?.description || '')}</textarea></label>
<div class="row"><button class="btn g" id="pgo">${p ? 'Save changes' : 'Add district'}</button></div></form>`);
  photoSlots('#pf', 'sl', ph, $('#e_pph'), crop169);
  $('#pf').onsubmit = async e => {
    e.preventDefault(); $$('#pf .err').forEach(x => x.textContent = '');
    const v = i => $('#' + i).value.trim(), E = {};
    if (v('pc').length < 2) E.pc = 'Required';
    if (v('ps').length < 2) E.ps = 'Required';
    let lat = v('pla'), lng = v('pln');
    if (!lat && !lng) { const c = coordsFromLink(v('pm')); if (c) { lat = c[0]; lng = c[1]; } }
    if ((lat || lng) && (!lat || !lng || isNaN(+lat) || isNaN(+lng) || Math.abs(+lat) > 90 || Math.abs(+lng) > 180)) E.pla = 'Enter a valid latitude and longitude';
    if (v('pm') && !MAPS_OK.test(v('pm'))) E.pm = 'Use a Google Maps link';
    if (v('pv') && !VIDEO_OK.test(v('pv'))) E.pv = 'Use a YouTube, Instagram or Facebook link';
    if (Object.keys(E).length) { for (const k in E) $('#e_' + k).textContent = E[k]; return; }
    const b = $('#pgo'); b.disabled = true; b.textContent = 'Saving…';
    try {
      const pid = id || crypto.randomUUID(), urls = [];
      for (let i = 0; i < 3; i++) {
        const x = ph[i]; if (!x) continue;
        if (x.startsWith('data:')) {
          urls.push(await CLOUD.uploadPhoto(x, 'place', SB));
        } else urls.push(x);
      }
      const row = { city: v('pc'), state: v('ps'), photos: urls, video_url: v('pv') || null, maps_link: v('pm') || null, description: v('pd'), lat: lat ? +lat : null, lng: lng ? +lng : null };
      const { error } = await (id ? SB.from('places').update(row).eq('id', id) : SB.from('places').insert({ id: pid, ...row }));
      if (error) throw error;
      if (id && p && p.state !== row.state) await SB.from('famous_places').update({ state: row.state }).eq('place_id', id);   // best effort
      dlg.close(); await loadAll(); render(); toast(id ? 'District updated' : 'District added');
    } catch (err) { b.disabled = false; b.textContent = id ? 'Save changes' : 'Add district'; toast(err.code === '23505' ? 'That district already exists' : (err.message || 'Could not save')); }
  };
}

function stateForm(old) {
  const sr = old ? A.states.find(x => x.name.toLowerCase() === old.toLowerCase()) : null, ph = sr ? [...(sr.photos || [])] : [];
  modal(old ? 'Edit state' : 'Add state', `<form id="sf" novalidate><label>State<input id="sn" value="${esc(old || '')}" autocomplete="off"></label>${old ? '' : '<label style="margin-top:12px">First district<input id="sd" autocomplete="off"></label><p class="sub">A state exists through its districts, so add at least one.</p>'}
<p class="sub" style="margin:14px 0 8px"><b>Photos</b> · up to 3 (1 main + 2 more). Landscape photos, <b>960 × 540 px (16:9)</b>, under 8 MB each; cropped to 16:9 automatically. Optional. Shown on the state card and the state page.</p>
<div class="slots wide">${slotsHtml('ssl')}</div><div class="err" id="e_sph"></div>
<label style="margin-top:12px">Description (optional)<textarea id="sds" rows="3" maxlength="600">${esc(sr?.description || '')}</textarea></label>
<div class="err" id="se"></div><div class="row"><button class="btn g" id="sgo">${old ? 'Save changes' : 'Add state'}</button></div></form>`);
  photoSlots('#sf', 'ssl', ph, $('#e_sph'), crop169);
  $('#sf').onsubmit = async e => {
    e.preventDefault(); $('#se').textContent = ''; const sn = $('#sn').value.trim(), sd = old ? '' : $('#sd').value.trim();
    if (sn.length < 2 || (!old && sd.length < 2)) return $('#se').textContent = old ? 'Enter a state name' : 'Enter the state and its first district';
    $('#sgo').disabled = true; $('#sgo').textContent = 'Saving…';
    try {
      const urls = [], key = crypto.randomUUID();
      for (let i = 0; i < 3; i++) {
        const x = ph[i]; if (!x) continue;
        if (x.startsWith('data:')) {
          urls.push(await CLOUD.uploadPhoto(x, 'state', SB));
        } else urls.push(x);
      }
      if (old) {
        if (sn !== old) {
          const r = await SB.from('places').update({ state: sn }).eq('state', old); if (r.error) throw r.error;
          await SB.from('famous_places').update({ state: sn }).eq('state', old);   // best effort (table exists after schema.sql)
          await SB.from('states').delete().eq('name', old);
        }
      } else { const r = await SB.from('places').insert({ state: sn, city: sd }); if (r.error) throw r.error; }
      const { error } = await SB.from('states').upsert({ name: sn, photos: urls, description: $('#sds').value.trim() }, { onConflict: 'name' });
      if (error) throw error;
      dlg.close(); await loadAll(); render(); toast(old ? 'State updated' : 'State added');
    } catch (err) { $('#sgo').disabled = false; $('#sgo').textContent = old ? 'Save changes' : 'Add state'; $('#se').textContent = err.code === '23505' ? 'That already exists' : (/relation .*states|schema cache/i.test(err.message || '') ? 'Run the latest supabase/schema.sql first' : (err.message || 'Could not save')); }
  };
}
/* Remove a state / district together with everything inside it (listings, destinations, hero + famous cards). */
const placeCounts = ids => ({ l: A.L.filter(x => ids.includes(x.place_id)).length, d: A.dests.filter(x => ids.includes(x.place_id)).length });
const cascadeTxt = c => (c.l || c.d ? ` This also permanently deletes ${c.l} listing${c.l === 1 ? '' : 's'} and ${c.d} destination${c.d === 1 ? '' : 's'} inside it.` : '');
async function wipePlaces(ids) {
  if (!ids.length) return;
  for (const [tbl, col] of [['destinations', 'place_id'], ['programs', 'place_id'], ['listings', 'place_id'], ['hero_cards', 'place_id'], ['famous_places', 'place_id']]) {
    const r = await SB.from(tbl).delete().in(col, ids);
    if (r.error && !/relation|schema cache/i.test(r.error.message || '')) throw r.error;
  }
  const { error } = await SB.from('places').delete().in('id', ids); if (error) throw error;
}
async function delState(st) {
  const ids = A.places.filter(p => p.state === st).map(p => p.id);
  await wipePlaces(ids);
  await SB.from('famous_places').delete().eq('state', st); await SB.from('states').delete().eq('name', st);   // best effort
  await loadAll(); render(); toast('State removed');
}

async function delPlace(id) {
  await wipePlaces([id]);
  await loadAll(); render(); toast('Place removed');
}

/* ---------- Filter options: resort types, amenities, activity categories, destination types ---------- */
const OPTS = [
  ['resort_type', 'Resort types', 'Resort type filter on Home and Resorts, and the owner upload form.'],
  ['amenity', 'Amenities', 'Amenities filter and the owner upload form.'],
  ['activity_category', 'Activity categories', 'Category filter on Home and Activities, and the owner upload form.'],
  ['destination_type', 'Destination types', 'Type of location in the Add a destination form.']];
const optRows = k => A.opts.filter(o => o.kind === k);
function optPanel(el) {
  el.innerHTML = `<p class="sub" style="margin-bottom:12px">Add or delete the options visitors and owners choose from. Deleting an option only removes it from the filters and forms; listings that already use it are not touched. If you delete every option in a list, the built-in defaults come back.</p>`
    + OPTS.map(([k, title, note]) => {
      const rows = optRows(k), names = rows.length ? rows.map(r => r.name) : OPT_DEF[k];
      return `<div class="sum" style="display:block"><h3 style="margin:0 0 2px">${title}</h3><p class="sub" style="margin:0 0 10px">${note}${rows.length ? '' : ' (showing built-in defaults)'}</p>
<div class="hch" style="margin-bottom:12px;justify-content:flex-start">${names.map(n => `<span class="tag" style="display:inline-flex;align-items:center;gap:8px;padding:6px 6px 6px 12px;font-size:.85rem">${esc(n)}<button type="button" data-a="odel" data-k="${k}" data-n="${esc(n)}" aria-label="Delete ${esc(n)}" style="border:0;background:#f6dcd8;color:#8a2f25;border-radius:50%;width:22px;height:22px;cursor:pointer;font-weight:800;line-height:1;padding:0">&times;</button></span>`).join('')}</div>
<form data-of="${k}" style="display:flex;gap:8px"><input name="n" maxlength="40" placeholder="Add new ${title.toLowerCase().replace(/s$/, '')}" autocomplete="off" style="flex:1;min-width:0"><button class="btn g sm">Add</button></form></div>`;
    }).join('');
}
async function optSeed(k) {
  if (optRows(k).length) return;
  const { error } = await SB.from('site_options').insert(OPT_DEF[k].map((name, i) => ({ kind: k, name, sort: i })));
  if (error) throw error;
}
async function optAdd(k, raw) {
  const name = String(raw || '').trim().replace(/\s+/g, ' ');
  if (name.length < 2) return toast('Enter at least 2 characters');
  const cur = optRows(k).length ? optRows(k).map(r => r.name) : OPT_DEF[k];
  if (cur.some(n => n.toLowerCase() === name.toLowerCase())) return toast('Already in the list');
  try {
    await optSeed(k);
    const { error } = await SB.from('site_options').insert({ kind: k, name, sort: Math.floor(Date.now() / 1000) });
    if (error) throw error;
  } catch (err) { return toast(/relation .*site_options|schema cache/i.test(err.message || '') ? 'Run the latest supabase/schema.sql first' : (err.message || 'Could not add')); }
  await loadAll(); panel(); toast('Added');
}
async function optDel(k, name) {
  const cur = optRows(k).length ? optRows(k).map(r => r.name) : OPT_DEF[k];
  if (cur.length <= 1) return toast('Keep at least one option');
  try {
    await optSeed(k);
    const { error } = await SB.from('site_options').delete().eq('kind', k).eq('name', name);
    if (error) throw error;
  } catch (err) { return toast(/relation .*site_options|schema cache/i.test(err.message || '') ? 'Run the latest supabase/schema.sql first' : (err.message || 'Could not delete')); }
  await loadAll(); panel(); toast('Deleted');
}
app.addEventListener('submit', e => { const f = e.target.closest('form[data-of]'); if (!f) return; e.preventDefault(); optAdd(f.dataset.of, f.elements.n.value); });

async function onClick(e) {
  const t = e.target.closest('[data-t],[data-fl],[data-fd],[data-fp],[data-fb],[data-fm],[data-a],#lo,#mb,#mb2,.ask'); if (!t) return;
  try {
    if (t.id === 'lo') { await SB.auth.signOut(); A.user = null; return renderLogin(); }
    if (t.id === 'mb' || t.id === 'mb2' || t.classList.contains('ask')) { A.nav = t.id === 'mb' ? !A.nav : false; lockNav(); return $('.ash').classList.toggle('open', A.nav); }
    if (t.dataset.t) { if (A.tab !== t.dataset.t) A.q = ''; A.tab = t.dataset.t; A.nav = false; if (t.dataset.fv) A.f = t.dataset.fv; else if (['Resorts', 'Activities'].includes(A.tab)) A.f = 'all'; return render(); }
    if (t.dataset.fl) { A.f = t.dataset.fl; return panel(); }
    if (t.dataset.fd) { A.df = t.dataset.fd; return panel(); }
    if (t.dataset.fp) { A.pf = t.dataset.fp; return panel(); }
    if (t.dataset.fb) { A.bf = t.dataset.fb; return panel(); }
    if (t.dataset.fm) {
      const k = t.dataset.fm, v = t.dataset.v;
      if (k === 'mode') A.fm = { mode: v, st: A.fm.st, pid: '' };
      else if (k === 'st') A.fm = { ...A.fm, st: v, pid: '' };
      else if (k === 'pid') A.fm = { ...A.fm, pid: v };
      return panel();
    }
    const id = t.dataset.id;
    switch (t.dataset.a) {
      case 'ban': return banBox(id);
      case 'unban': return ask('Lift the ban on this owner now?', 'Lift ban', async () => { chk(await SB.rpc('admin_ban_owner', { p_owner: id, p_days: 0, p_reason: '' })); await loadAll(); panel(); toast('Ban lifted'); });
      case 'view': return review(id);
      case 'ok': dlg.open && dlg.close(); return setStatus(id, 'published');
      case 'no': return rejectBox(id);
      case 'un': return ask('Unpublish this listing? It will disappear from the public site until approved again.', 'Unpublish', () => setStatus(id, 'pending'));
      case 'del': return ask('Delete this listing permanently?', 'Delete', async () => {
        const { error } = await SB.from('listings').delete().eq('id', id);
        if (error) throw error; await loadAll(); render(); toast('Listing deleted'); });
      case 'pview': return preview(id);
      case 'pok': dlg.open && dlg.close(); return setProgStatus(id, 'published');
      case 'pno': return rejectBox(id, 'p');
      case 'pun': return ask('Unpublish this program? It will disappear from Today\'s programs.', 'Unpublish', () => setProgStatus(id, 'pending'));
      case 'pdel': return ask('Delete this program permanently?', 'Delete', async () => {
        const { error } = await SB.from('programs').delete().eq('id', id);
        if (error) throw error; await loadAll(); render(); toast('Program deleted'); });
      case 'dview': return dreview(id);
      case 'dok': dlg.open && dlg.close(); return setDestStatus(id, 'published');
      case 'dno': return rejectBox(id, 'd');
      case 'dun': return ask('Unpublish this destination? It will disappear from Popular destinations.', 'Unpublish', () => setDestStatus(id, 'pending'));
      case 'ddel': return ask('Delete this destination permanently?', 'Delete', async () => {
        const { error } = await SB.from('destinations').delete().eq('id', id);
        if (error) throw error; await loadAll(); render(); toast('Destination deleted'); });
      case 'ft': return toggleFeat(id);
      case 'bst': return toggleBest(id);
      case 'cmdel': return ask('Remove this comment? It disappears for everyone.', 'Remove', async () => {
        const cm = A.cm.find(c => c.id === id), { error } = await SB.from(cm && cm._t === 'listing' ? 'listing_comments' : 'dest_comments').delete().eq('id', id);
        if (error) throw error; await loadAll(); render(); toast('Comment removed'); });
      case 'bgst': { const b = A.bugs.find(x => x.id === id), { error } = await SB.from('bug_reports').update({ status: b.status === 'open' ? 'resolved' : 'open' }).eq('id', id); if (error) throw error; await loadAll(); render(); return toast(b.status === 'open' ? 'Marked resolved' : 'Reopened'); }
      case 'bgdel': return ask('Delete this bug report?', 'Delete', async () => { const { error } = await SB.from('bug_reports').delete().eq('id', id); if (error) throw error; await loadAll(); render(); toast('Bug deleted'); });
      case 'fsel': return famToggle(id);
      case 'fdel': return ask('Delete this destination permanently? It is removed from Famous places and Popular destinations for everyone. This cannot be undone.', 'Delete', async () => {
        await SB.from('famous_places').delete().eq('destination_id', id);   // best effort (also cascades in the DB)
        const { error } = await SB.from('destinations').delete().eq('id', id);
        if (error) throw error; await loadAll(); render(); toast('Destination deleted'); });
      case 'addh': return heroForm();
      case 'eh': return heroForm(id);
      case 'th': { const h = A.hero.find(x => x.id === id), { error } = await SB.from('hero_cards').update({ active: !h.active }).eq('id', id); if (error) throw error; await loadAll(); return panel(); }
      case 'dh': return ask('Delete this card?', 'Delete', async () => { const { error } = await SB.from('hero_cards').delete().eq('id', id); if (error) throw error; await loadAll(); render(); toast('Card deleted'); });
      case 'addp': return placeForm();
      case 'adp': return placeForm(null, t.dataset.st);
      case 'ast': return stateForm();
      case 'est': return stateForm(t.dataset.st);
      case 'dst': { const c = placeCounts(A.places.filter(p => p.state === t.dataset.st).map(p => p.id)); return ask(`Delete ${esc(t.dataset.st)} and all its districts?${cascadeTxt(c)} This cannot be undone.`, 'Delete', () => delState(t.dataset.st)); }
      case 'odel': return ask(`Delete &ldquo;${esc(t.dataset.n)}&rdquo; from the list?`, 'Delete', () => optDel(t.dataset.k, t.dataset.n));
      case 'ep': return placeForm(id);
      case 'dp': return ask(`Delete this district?${cascadeTxt(placeCounts([id]))} This cannot be undone.`, 'Delete', () => delPlace(id));
    }
  } catch (err) { toast(err.message || 'Something went wrong'); }
}
app.addEventListener('click', onClick);
dlg.addEventListener('click', onClick);

/* ---------- start ---------- */
/* wait for DOMContentLoaded so every script tag (including admin-money.js) has run before the first screen */
addEventListener('DOMContentLoaded', () => { if (!SB) renderLogin(); else enter().catch(e => renderLogin(e.message)); });
