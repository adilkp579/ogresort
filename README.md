# Verdane: Resorts & Stays

Static front-end (no build step) + Supabase (Auth, Postgres) + Cloudflare Worker (Razorpay payments, R2 photo uploads). **Start with SETUP.md.**

```
verdane/
├── index.html              Public site + business-owner area
├── kpverthyadmin/index.html Admin dashboard (own login page, own session)
├── css/
│   ├── styles.css          Shared design (unchanged look)
│   └── kpverthyadmin.css           Admin-only additions
├── js/
│   ├── config.js           Supabase URL + anon key  <-- edit this
│   ├── supabase.js         Client factory (site and admin use separate sessions)
│   ├── api.js              ALL Supabase calls for the site
│   ├── services.js         Loads server data into the store, session + booking sync
│   ├── util.js             Helpers, generated art, shared constants
│   ├── state.js            In-memory store (S) + guest-only local data
│   ├── ui.js               Dialog, navigation, cards, tab highlight
│   ├── location.js         City-based location
│   ├── pages/              home, resorts, activities, destinations, place, detail, booking, checkout, bookings, profile
│   ├── kpverthyadmin.js            Admin dashboard app
│   └── app.js              Startup
└── supabase/schema.sql             The whole database in ONE file: tables, RLS, RPCs, photo bucket, districts, destinations
```

## Setup

1. Create a project at supabase.com.
2. **SQL Editor** -> paste `supabase/schema.sql` -> Run. This single file creates everything: tables, security rules, the `listing-photos` bucket, districts with coordinates, and destination suggestions. No sample data is added. It is safe to re-run, and it also upgrades a database made with the older separate 002-005 files.
3. **Project Settings -> API**: copy the Project URL and the `anon` key into `js/config.js`.
4. **Authentication -> Providers -> Email**: for quick testing turn off "Confirm email". If you keep it on, new owners must click the email link before logging in.
5. **Create the admin**: Authentication -> Users -> Add user (email + password). Then run in the SQL Editor:
   ```sql
   update public.profiles set role = 'admin' where email = 'you@example.com';
   ```
6. Host the folder on any static host (Netlify, Vercel, Cloudflare Pages, GitHub Pages) or run `npx serve verdane` locally.
   Site: `/`  ·  Admin: `/kpverthyadmin/`

## How it works

| Who | Can do |
|---|---|
| Guest (no account) | Browse published listings, book, cancel/modify own bookings, suggest a destination with the **+** on Popular destinations |
| Owner (sign up on Profile tab) | Upload stays/activities **only in places the admin added**, edit/delete own listings, confirm/decline bookings on own listings |
| Admin (`/kpverthyadmin/`) | Side menu: Overview, Approvals, Bookings, Owner payments, Pricing, Destinations, States, Districts, Resorts, Activities, Hero cards, Famous places, Home sections, Comments, Owners. Approve / reject / unpublish / delete listings and destinations, manage states and districts, view owners |

- A listing is **public only when an admin approves it**. Every owner insert or edit is forced back to `pending` by a database trigger, so this cannot be bypassed from the browser.
- Owners pick a place from a dropdown. The database enforces it too (`listings.place_id` references `places`).
- A place with listings cannot be removed (remove or move the listings first).
- Admin accounts cannot log in on the public site, and owner accounts cannot enter the dashboard.
- Rejected listings show the admin's reason on the owner's profile.
- **Destinations**: anyone can tap + on Popular destinations and submit 1 photo, state, city, exact location, Google Maps link and location type. They see a thank-you message; the submission lands in the dashboard's **Destinations** tab as pending and becomes public only after approval. Submissions are always created as pending by a database trigger, the maps link must be a Google Maps link (checked in the browser) and https (checked in the database), and a hidden honeypot field filters simple bots. For heavy public traffic add CAPTCHA/rate limiting.
- **Today's programs** (Home, below Activities): anyone taps + and submits a program with photos, name, **program date**, optional start time, **Free or Paid** (price per person when paid), district, venue and a Google Maps link. It is created as pending (database trigger; past dates are refused) and appears on Home on its date only after approval in the dashboard's **Programs** tab. Visitors change the date with the **Today** chip and can filter All / Free / Paid; **View all** opens a separate **Today's programs** page (Back returns to Home at the same spot) listing every upcoming program by date with the same Free / Paid filter. The add form takes optional **video links** (YouTube / Instagram / Facebook, up to 5 with "+ Add more link"); on a program's page they come after the photos as video cards that play in place, and the admin Review window has an "Open video" button for each. Needs the latest `supabase/schema.sql` (adds the `programs` table and its `video_links` column).
- Tapping a Popular destinations card opens that place's page: photo header (plus exact location and Google Maps button for visitor-added destinations), **Stays on the left and Activities on the right**, two columns on phones too. A card matches by city or state, so a "Kerala" card lists every Kerala stay and activity.
- Destination photos and video: visitors can add up to 3 photos and 1 video link (YouTube, Instagram or Facebook). The place page shows the main photo, the other photos underneath to swap it, then the description, the Google Maps button and the video (YouTube plays inline; Instagram and Facebook open in a new tab because they block embedding), then the stays and activities cards.
- Admin **Places** tab: add or edit a place with up to 3 photos, video link, Google Maps link and description. A place with photos also shows in Popular destinations automatically.
- On desktop the navigation bar is a vertical bar on the left; on phones it stays at the bottom.
- **States and districts** are managed in the dashboard's Places tab (state + district, optional photos, video, Maps link, description and latitude/longitude). Stays, activities and destinations can only be added inside those districts.
- **Popular destinations** show state cards, then the district cards of the chosen state, then the destination cards of the selected district. A destination records its town, street and an optional landmark.
- **Location**: the header chip uses live location by default (nearest district, within 150 km, needs coordinates on the district) and the visitor can tap it to pick any district manually. Home, Stays and Activities then show that district (Resorts and Activities have a *My location / All districts* switch).
- The search bar on Home, Resorts and Activities sticks under the header with a glass blur while the rest of the page scrolls; its filter panel opens as a floating glass panel.

- **My dates colours**: green = booked by a guest, red = reserved by the owner, white = available. Guests see the same colours under the date fields and cannot pick green or red dates.
- **State photos**: Admin -> States -> Edit: up to 3 photos and a description for a state. The state card and state page use them (falls back to district photos).
- **Famous places**: Admin -> Famous places. Press **State** or **District**; pick a state (e.g. Kerala) and, for District, one of its districts; then tick the approved destination cards you want (Add to Famous). They show as a left-to-right scrolling **Famous destinations** row above Stays and Activities on that state's or district's page. Unpublished or deleted destinations disappear from the row automatically.
- Re-run `supabase/schema.sql` once to create the new `states` and `famous_places` tables.

## Notes

- There is no sample or stock content: no demo listings, no stock photos, no generated art. A listing without a photo shows a neutral grey placeholder.
- There is no sample data. The site shows only what the admin adds (states, districts, photos) and approves (stays, activities, destinations).
- Totals are recomputed on the Worker; online payment via Razorpay, photos in Cloudflare R2 (see SETUP.md).
- Guests are identified by booking reference only. Add guest accounts if you need stronger privacy.

## Filter options + deleting from the admin page
- Home filter panel: choosing **Resorts** shows resort type, sort, price, amenities; **Activities** shows category, sort, price; **All** shows only sort and price.
- Admin > **Filter options**: add/delete resort types, amenities, activity categories and destination types (needs the latest `supabase/schema.sql` for the `site_options` table; until then the built-in defaults are used).
- Admin > **States / Districts / Destinations**: Delete now works even when listings exist (the confirm box says how many listings/destinations go with it).

## Admin: Bookings and Owner payments

Run the new block at the end of `supabase/schema.sql` (payout tables + admin read access to payments/refunds) and redeploy the Worker (new route `POST /v1/bookings/admin-action`).

- **Bookings**: all bookings with search (ref, guest, phone, listing, owner), status chips, type/owner/date filters, sort, today's check-ins, pagination, CSV export, and a detail view (guest, stay/activity, owner, Razorpay ids, refund status, commission split). Admin can confirm, decline, cancel (full refund) or complete any booking.
- **Owner payments**: Summary per owner (settled revenue, commission, earning, paid out, balance due, held for upcoming), Payouts ledger (record, filter, delete, CSV), Owner accounts (UPI / bank), per-owner statement (CSV / print). Commission % is set on the Summary tab.
- Money rules: collected = paid - refunded. Commission = % of booking total on Completed bookings (of the money kept on Cancelled ones). Owner earning = collected - commission (negative means the owner owes the platform, e.g. only a 5% advance was paid online). Balance due = earnings - payouts recorded.

## Admin: Pricing (tax, service fee, advance %)

Run the last block of `supabase/schema.sql` (table `pricing_rules`) and redeploy the Worker.
Dashboard > **Pricing**: set tax %, service fee (₹ per booking) and "pay advance" % for all stays and all activities, and optionally a separate rule per category (Resort, Villa, Water...). A category without its own rule uses the default. The Worker prices every booking from these rules and the booking page and checkout show the same numbers. Changes apply to new bookings only; each booking stores the rates it was priced with (`details.rates`).
