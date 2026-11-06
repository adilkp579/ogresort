/* Services: load server data into the in-memory store (S) and keep it in sync.
   Pages read S synchronously; only this file talks to the API layer for reads. */
async function loadPlaces() { S.places = await API.places(); }
async function loadStates() { S.states = await API.states(); }
async function loadFamous() { S.famous = await API.famous(); }
/* Admin-defined option lists replace the built-in ones; a kind with no rows keeps its defaults. */
async function loadOptions() {
  const rows = await API.options(), by = k => rows.filter(r => r.kind === k).map(r => r.name);
  const pick = k => (by(k).length ? by(k) : OPT_DEF[k]);
  TYPES = pick('resort_type'); AMEN = pick('amenity'); ACAT = pick('activity_category'); DEST_TYPES = pick('destination_type');
}
async function loadPricing() { S.pricing = await API.pricing(); }
async function loadHero() { S.hero = await API.heroCards(); }
async function loadDestinations() { S.dests = await API.destinations(); S.dsoc = { ...(S.dsoc || {}), ...(await API.destStats()) }; }
async function loadPrograms() { S.progs = await API.programs(); }

async function loadListings() {
  const pub = await API.published(), mine = S.account ? await API.mine(S.account.id) : [], m = new Map();
  [...pub, ...mine].forEach(r => m.set(r.id, r));
  const L = [...m.values()];
  S.props = L.filter(x => x.type);          // stays
  S.prods = L.filter(x => x.cat);           // activities
  L.forEach(x => { if (x.photos && x.photos.length) IMGS[x.id] = x.photos; });
  try { S.dsoc = { ...(S.dsoc || {}), ...(await API.listingStats()) }; } catch (e) {}
  try { S.hosts = await API.hosts(); } catch (e) { S.hosts = []; }
}

async function loadOwnerBookings() { S.inbox = S.session ? await API.ownerBookings() : []; }

/* Called after login and on startup. Only owner accounts may use the site; admins use their own dashboard. */
async function afterAuth() {
  const u = await API.currentUser();
  if (!u) { S.account = null; S.session = false; S.inbox = []; return; }
  if (u.banned_until && new Date(u.banned_until) > new Date()) {
    await API.signOut(); S.account = null; S.session = false;
    const left = Math.ceil((new Date(u.banned_until) - Date.now()) / 864e5);
    throw new Error(`This account is banned until ${new Date(u.banned_until).toLocaleDateString()} (${left} day${left === 1 ? '' : 's'} left).${u.ban_reason ? ' Reason: ' + u.ban_reason : ''}`);
  }
  if (u.role !== 'owner') {
    await API.signOut(); S.account = null; S.session = false;
    throw new Error('This is an admin account. Please use the admin dashboard.');
  }
  S.account = { id: u.id, business: u.business_name, phone: u.phone, email: u.email, type: 'Business owner', name: u.display_name || '', loc: u.loc || '', avatar: u.avatar || '', cover: u.cover || '', maps: u.maps_link || '', wa: u.whatsapp || '' };
  S.session = true;
  await Promise.all([loadListings(), loadOwnerBookings()]);
}

/* Refresh the guest's own bookings (host may have confirmed / declined them) */
async function syncGuest() {
  const all = [...S.bookings, ...S.tickets].filter(x => x.key);
  if (!all.length || !API.ready() || !CLOUD.ready()) return;
  for (let i = 0; i < all.length; i += 20) {
    const chunk = all.slice(i, i + 20), rows = await API.guestStatuses(chunk.map(x => ({ ref: x.id, key: x.key })));
    const m = new Map(rows.map(r => [r.ref, r]));
    chunk.forEach(x => { const r = m.get(x.id); if (!r) return;
      x.status = r.status; x.by = r.cancelled_by || undefined; x.conf = r.status === 'Upcoming'; x.total = r.total;
      if (r.pay) x.pay = r.pay; });
  }
  S.bookings = S.bookings.filter(x => x.status !== 'Expired');     // an unpaid hold that timed out was never a booking
  S.tickets = S.tickets.filter(x => x.status !== 'Expired');
  save();
}

let lastSync = 0;
function syncBookings() {
  if (!API.ready() || Date.now() - lastSync < 15000) return;
  lastSync = Date.now();
  Promise.all([syncGuest(), S.session ? loadOwnerBookings() : null])
    .then(() => { if ($('#bookings').classList.contains('on')) rBookings(true); })
    .catch(() => {});
}

async function boot() {
  if (!API.ready()) { console.warn('Supabase is not configured: edit js/config.js'); return; }
  try {
    await loadPlaces();
    await loadOptions().catch(() => {});   // table exists only after supabase/schema.sql
    await loadPricing().catch(() => {});   // tax / service fee / advance % set by the admin (built-in defaults until then)
    await loadHero().catch(() => { S.hero = []; });   // table exists only after supabase/schema.sql
    await loadStates().catch(() => { S.states = []; });
    await loadFamous().catch(() => { S.famous = []; });
    await loadDestinations().catch(() => {});   // table exists only after supabase/schema.sql
    await loadPrograms().catch(() => {});   // table exists only after supabase/schema.sql
    await afterAuth().catch(() => {});
    await loadListings();
  } catch (e) { toast('Could not load data. Check your connection.'); }
}
