/* Data access layer: every Supabase call used by the public site / owner area lives here.
   Rows are mapped to the shapes the UI already uses, so the pages stay unchanged. */
const SB = supabaseReady() ? makeClient('verdane-owner-auth') : null;
const titleCase = s => (s ? s[0].toUpperCase() + s.slice(1) : s);
const chk = r => { if (r.error) throw r.error; return r.data; };

function mapListing(r) {
  const p = r.places || {}, stay = r.kind === 'stay';
  const b = {
    id: r.id, name: r.name, city: p.city || '', state: p.state || '', place_id: r.place_id,
    price: +r.price, types: r.types || [], desc: r.description || '', owner: r.owner_id,
    status: titleCase(r.status), note: r.review_note || '', created: Date.parse(r.created_at),
    town: r.town || '', street: r.street || '', landmark: r.landmark || '', link: r.maps_link || '',
    videos: r.video_links || [], photos: r.photos || [], feat: !!r.home_featured, best: !!r.home_best, rating: +r.rating || 4.5, pop: Math.round((+r.rating || 4.5) * 20),
    cover: 0, c: ['#163D32', '#C5A46D']
  };
  if (stay) return { ...b, type: r.category, country: 'India', address: [r.street, r.town, b.city, b.state].filter(Boolean).join(', '),
    rooms: r.rooms || 1, cap: r.capacity || 2, am: r.amenities || [], cin: '14:00', cout: '11:00',
    rules: 'Free cancellation up to 48 hours before check-in.',
    img: scene('#163D32', '#C5A46D', 5, 'pool'), kind: 'pool' };
  return { ...b, cat: r.category, dur: r.duration || '',
    img: scene('#2f7d6d', '#d9c58f', 7, ACATK[r.category]), kind: ACATK[r.category] };
}

function mapBooking(r) {
  const stay = r.kind === 'stay';
  return { id: r.ref, k: stay ? 'stay' : 'act', rid: stay ? r.listing_id : undefined, aid: stay ? undefined : r.listing_id,
    guest: r.guest_name, email: r.guest_email, phone: r.guest_phone, note: r.note, total: +r.total,
    status: r.status, by: r.cancelled_by || undefined, conf: r.status === 'Upcoming',
    at: Date.parse(r.created_at), paidPaise: +r.amount_paid_paise || 0, refPaise: +r.refunded_paise || 0, ...r.details };
}

function mapDest(r) {
  const ph = r.photos && r.photos.length ? r.photos : [r.photo];
  return { id: r.id, name: r.name || r.city, place_id: r.place_id, town: r.town || '', street: r.street || '', landmark: r.landmark || '', state: r.state, city: r.city, type: r.type, location: r.location, link: r.maps_link,
    photos: ph, video: r.video_url || '', videos: (r.video_links && r.video_links.length) ? r.video_links : (r.video_url ? [r.video_url] : []), desc: r.description || '', created: Date.parse(r.created_at) };
}

function mapProgram(r) {
  const ph = r.photos && r.photos.length ? r.photos : [r.photo];
  return { id: r.id, name: r.name, place_id: r.place_id, state: r.state, city: r.city, town: r.town || '', street: r.street || '', landmark: r.landmark || '', location: r.location, link: r.maps_link,
    photos: ph, date: r.program_date, time: r.start_time || '', free: !!r.is_free, price: r.price == null ? 0 : +r.price, desc: r.description || '', videos: r.video_links || [], created: Date.parse(r.created_at) };
}

const API = {
  ready: () => !!SB,

  /* places (read-only here; admin manages them) */
  places: async () => chk(await SB.from('places').select('*').order('state').order('city')),

  /* state photos and famous places (admin-managed; empty until supabase/schema.sql is run) */
  async states() { const r = await SB.from('states').select('*'); return r.error ? [] : r.data; },
  async famous() { const r = await SB.from('famous_places').select('*').eq('active', true).order('sort').order('created_at'); return r.error ? [] : r.data; },

  /* admin-managed filter options (resort types, amenities, activity categories, destination types) */
  async pricing() { const r = await SB.from('pricing_rules').select('kind,category,tax_pct,service_fee,advance_pct'); return r.error ? [] : r.data; },
  async options() { const r = await SB.from('site_options').select('*').order('sort').order('created_at'); return r.error ? [] : r.data; },

  /* bug reports from the footer button (admin reads them in Dashboard > Bugs) */
  async bugReport(message, contact, page) { return chk(await SB.rpc('bug_report_add', { p_device: deviceId(), p_message: message, p_contact: contact, p_page: page, p_agent: (navigator.userAgent || '').slice(0, 300) })); },

  /* destination likes + comments (database enforces 1 like and 1 comment per device per destination) */
  async destStats() {
    const { data, error } = await SB.rpc('dest_stats', { p_device: deviceId() });
    const m = {}; if (error || !data) return m;
    data.forEach(r => { m[r.dest_id] = { likes: r.likes, comments: r.comments, liked: r.liked, commented: r.commented }; });
    return m;
  },
  async destLike(id) { return chk(await SB.rpc('dest_like_toggle', { p_dest: id, p_device: deviceId() })); },
  async destComments(id) { return chk(await SB.rpc('dest_comment_list', { p_dest: id, p_device: deviceId() })); },
  async destComment(id, name, body) { return chk(await SB.rpc('dest_comment_add', { p_dest: id, p_device: deviceId(), p_name: name, p_body: body })); },

  /* the same like / comment system for stay + activity cards */
  async listingStats() {
    const { data, error } = await SB.rpc('listing_stats', { p_device: deviceId() });
    const m = {}; if (error || !data) return m;
    data.forEach(r => { m[r.listing_id] = { likes: r.likes, comments: r.comments, liked: r.liked, commented: r.commented }; });
    return m;
  },
  async listingLike(id) { return chk(await SB.rpc('listing_like_toggle', { p_listing: id, p_device: deviceId() })); },
  async listingComments(id) { return chk(await SB.rpc('listing_comment_list', { p_listing: id, p_device: deviceId() })); },
  async listingComment(id, name, body) { return chk(await SB.rpc('listing_comment_add', { p_listing: id, p_device: deviceId(), p_name: name, p_body: body })); },

  /* hero cards shown at the top of Home (per district) */
  heroCards: async () => chk(await SB.from('hero_cards').select('*').eq('active', true).order('sort').order('created_at')),

  /* destinations: anyone can submit; only admin-approved ones are readable */
  destinations: async () => chk(await SB.from('destinations').select('*').eq('status', 'published').order('created_at', { ascending: false })).map(mapDest),
  async submitDestination(p) {
    const id = crypto.randomUUID(), urls = [];
    for (let i = 0; i < p.photos.length; i++) urls.push(await CLOUD.uploadPhoto(p.photos[i], 'destination'));   // R2, via the Worker
    const { error } = await SB.from('destinations').insert({ id, name: p.name, place_id: p.place_id, state: p.state, city: p.city, type: p.type, location: p.location,
      town: p.town, street: p.street, landmark: p.landmark || null, maps_link: p.maps_link, description: p.description, photo: urls[0], photos: urls, video_url: p.video_url || null, video_links: p.videos || [] });
    if (error) throw error;
  },

  /* programs: anyone can submit (with a date, free or paid); only admin-approved ones are readable, from today on */
  programs: async () => chk(await SB.from('programs').select('*').eq('status', 'published').gte('program_date', localDate(-1)).order('program_date').order('start_time', { nullsFirst: false })).map(mapProgram),
  async submitProgram(p) {
    const id = crypto.randomUUID(), urls = [];
    for (let i = 0; i < p.photos.length; i++) urls.push(await CLOUD.uploadPhoto(p.photos[i], 'destination'));   // same anonymous R2 scope as destination photos
    const { error } = await SB.from('programs').insert({ id, name: p.name, place_id: p.place_id, state: p.state, city: p.city, town: p.town, street: p.street, landmark: p.landmark || null,
      location: p.location, maps_link: p.maps_link, photo: urls[0], photos: urls, program_date: p.date, start_time: p.time || null, is_free: p.free, price: p.free ? null : p.price, description: p.description, video_links: p.videos || [] });
    if (error) throw error;
    const c = await SB.from('program_submitters').insert({ program_id: id, name: p.sname, phone: p.sphone, owner_id: p.owner || null });
    if (c.error) throw c.error;
  },

  /* listings */
  published: async () =>
    chk(await SB.from('listings').select('*, places(city,state)').eq('status', 'published').order('created_at', { ascending: false })).map(mapListing),
  /* hosts shown on the Home "Best resorts" cards (name, place, photo). Empty list if the SQL update has not been run yet. */
  saveOwnerCover: async (cover) => chk(await SB.rpc('update_owner_cover', { p_cover: cover || '' })),
  saveOwnerLinks: async (maps, wa) => chk(await SB.rpc('update_owner_links', { p_maps: maps || '', p_whatsapp: wa || '' })),
  hosts: async () => { if (!SB) return []; const r = await SB.rpc('resort_hosts'); return r.error ? [] : (r.data || []); },
  saveOwnerProfile: async (name, phone, loc, avatar) => chk(await SB.rpc('update_owner_profile', { p_name: name, p_phone: phone, p_loc: loc, p_avatar: avatar || '' })),
  mine: async uid =>
    chk(await SB.from('listings').select('*, places(city,state)').eq('owner_id', uid).order('created_at', { ascending: false })).map(mapListing),

  async saveListing(p) {
    const u = (await SB.auth.getUser()).data.user;
    if (!u) throw new Error('Please log in again');
    const id = p.id || crypto.randomUUID(), photos = [];
    for (let i = 0; i < p.photos.length; i++) {            // upload new (data:) photos to R2, keep existing URLs
      const x = p.photos[i];
      photos.push(x.startsWith('data:') ? await CLOUD.uploadPhoto(x, 'listing', SB) : x);
    }
    let removed = [];
    if (p.id) { const old = await SB.from('listings').select('photos').eq('id', id).maybeSingle(); removed = ((old.data && old.data.photos) || []).filter(x => !photos.includes(x)); }
    const row = { owner_id: u.id, kind: p.kind, name: p.name, place_id: p.place_id, category: p.category, price: p.price,
      description: p.description, types: p.types, amenities: p.amenities, rooms: p.rooms, capacity: p.capacity,
      duration: p.duration, town: p.town, street: p.street, landmark: p.landmark || null, maps_link: p.maps_link, video_links: p.videos || [], photos };
    const { error } = await (p.id ? SB.from('listings').update(row).eq('id', id) : SB.from('listings').insert({ id, ...row }));
    if (error) throw error;
    CLOUD.deletePhotos(removed, SB);                       // best effort, after the database accepted the change
    return id;
  },
  deleteListing: async id => {
    const old = await SB.from('listings').select('photos').eq('id', id).maybeSingle();
    const { error } = await SB.from('listings').delete().eq('id', id); if (error) throw error;
    CLOUD.deletePhotos(old.data && old.data.photos, SB);
  },

  /* owner auth */
  async signUp(email, password, business, phone) {
    const { data, error } = await SB.auth.signUp({ email, password, options: { data: { business_name: business, phone } } });
    if (error) throw error;
    return data;
  },
  async signIn(email, password) {
    const { error } = await SB.auth.signInWithPassword({ email, password });
    if (error) throw error;
  },
  signOut: () => SB.auth.signOut(),
  async currentUser() {
    const { data: { session } } = await SB.auth.getSession();
    if (!session) return null;
    const { data } = await SB.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
    return data;
  },

  /* bookings: money and status changes go through the Worker. Guests prove ownership with the secret key of each booking. */
  async checkoutOrder(payload) {
    const turnstile = await CLOUD.turnstileToken();
    return CLOUD.request('/v1/checkout/orders', { body: payload, turnstile });
  },
  checkoutVerify: p => CLOUD.request('/v1/checkout/verify', { body: p }),
  async guestStatuses(items) { return (await CLOUD.request('/v1/bookings/status', { body: { items } })).bookings; },
  guestCancel: (ref, key) => CLOUD.request('/v1/bookings/cancel', { body: { ref, key } }),
  modifyBooking: (ref, key, d) => CLOUD.request('/v1/bookings/modify', { body: { ref, key, ...d } }),
  /* dates nobody can book (green = booked/reserved, red = blocked) */
  async unavailable(id, ref) { const r = await SB.rpc('listing_unavailable', { p_listing: String(id), p_exclude_ref: ref || null }); return r.error ? [] : (r.data || []); },
  async setDays(id, days, kind) {
    if (kind === 'free') return chk(await SB.from('listing_days').delete().eq('listing_id', id).in('day', days));
    return chk(await SB.from('listing_days').upsert(days.map(day => ({ listing_id: id, day, kind })), { onConflict: 'listing_id,day' }));
  },
  ownerBookings: async () => chk(await SB.from('bookings').select('id,ref,listing_id,owner_id,kind,guest_name,guest_email,guest_phone,note,total,details,status,cancelled_by,created_at,amount_paid_paise,refunded_paise,pay_mode').order('created_at', { ascending: false })).map(mapBooking),
  /* confirm / decline / cancel / complete: the Worker also refunds the guest when needed */
  async setBookingStatus(ref, action) {
    const { data } = await SB.auth.getSession(); const token = data.session && data.session.access_token;
    if (!token) throw new Error('Please log in again');
    return CLOUD.request('/v1/bookings/host-action', { body: { ref, action }, token });
  }
};
