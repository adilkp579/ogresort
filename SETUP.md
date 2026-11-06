# Verdane v4: Razorpay + Cloudflare R2 + Worker setup

```
Browser (Cloudflare Pages)  ──►  Worker  verdane-api  ──►  Razorpay API
        │                           │  ├──►  R2 bucket (photos)
        └── Supabase (RLS) ◄────────┘  └──►  Supabase (service role, server only)
Razorpay ──webhook──► Worker        Cron (every 5 min): expire holds, retry refunds, catch missed payments
```
Photos: browser → Worker → R2, the public URL is saved in Supabase as before.
Payments: the browser never decides an amount or a booking status. The Worker does.

## 1. Supabase
1. SQL Editor → run the whole `supabase/schema.sql` again (safe to re-run).
2. Set your photo domain (use the domain from step 3):
   ```sql
   insert into public.app_settings (key, value) values ('media_base_url', 'https://media.yourdomain.com')
   on conflict (key) do update set value = excluded.value;
   ```
3. Project Settings → API: copy the **service_role / secret key**. It goes only into the Worker (step 4). Never into js/.

## 2. Razorpay
1. Dashboard → Settings → API Keys: generate **Test** keys. Key id → `RAZORPAY_KEY_ID` in wrangler.toml; key secret → Worker secret.
2. Settings → Payment Capture: Automatic (the Worker also captures if needed).
3. After the Worker is deployed: Settings → Webhooks → add `https://<worker>/v1/webhooks/razorpay`, choose a secret, events:
   `payment.authorized, payment.captured, payment.failed, order.paid, refund.processed, refund.failed`.
4. Test with Razorpay test cards/UPI first. Go live (KYC, live keys) only after the checklist below.

## 3. Cloudflare R2 + Turnstile
```
npm i -g wrangler && wrangler login
wrangler r2 bucket create verdane-media
```
Dashboard → R2 → verdane-media → Settings → **Custom Domains** → `media.yourdomain.com` (do not use r2.dev in production).
Rules → Transform Rules → Modify Response Header for that host: set `X-Content-Type-Options: nosniff`.
Turnstile → Add widget (Managed, your domain) → site key goes in `js/config.js`, secret key is a Worker secret.

## 4. Deploy the Worker
```
cd worker
npm install
# edit wrangler.toml: RAZORPAY_KEY_ID, MEDIA_BASE_URL, ALLOWED_ORIGINS (+ custom domain route)
wrangler secret put RAZORPAY_KEY_SECRET
wrangler secret put RAZORPAY_WEBHOOK_SECRET
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
wrangler secret put TURNSTILE_SECRET
npm test        # 43 tests, no network needed
wrangler deploy
```
Check `https://<worker>/healthz` returns `{"ok":true}`.
(Rate-limit binding syntax `[[ratelimits]]` needs a recent wrangler; if deploy complains, see the Workers "Rate Limiting" docs.)

## 5. Website
1. `js/config.js`: set `API_BASE` (Worker URL) and `TURNSTILE_SITEKEY`.
2. Edit `_headers` (media + API hosts), deploy the folder to Cloudflare Pages.
3. Add the Pages URL to `ALLOWED_ORIGINS` and redeploy the Worker.

## Rules baked in (change in `worker/src/lib/policy.js` and `pricing.js`)
- Prices are recomputed on the server from the listing. Tax %, service fee and advance % are set in the admin dashboard (Pricing), per category (defaults: stays 12% tax + ₹450 fee, activities 5% tax, 5% advance).
- Dates are held 15 min while paying; unpaid holds expire. Max 3 unpaid holds per email.
- Refunds: host decline/cancel = full. Guest: unconfirmed = full; confirmed = full until 48 h (stays) / 24 h (activities) before start, then none. Razorpay's own fee is not returned by Razorpay.
- Booking changes: price recomputed; cannot go below what was already paid.

## Go-live checklist
- [ ] Test mode: pay, close the tab before the success screen → booking still appears (webhook/cron).
- [ ] Test mode: cancel inside/outside the window → refund appears in Razorpay dashboard.
- [ ] Webhook shows 200 in Razorpay dashboard; `wrangler tail` shows no errors.
- [ ] Live keys swapped (`RAZORPAY_KEY_ID`, secret, new webhook secret); `workers_dev = false`.
- [ ] `ALLOWED_ORIGINS` has only your real domains; Turnstile widget limited to your domain.
- [ ] Rotate any key that was ever pasted in chat/email.

## Known limits / not covered
- The UI uses inline `onclick` handlers, so CSP needs `'unsafe-inline'` for scripts; moving to addEventListener would allow a strict CSP. I did not audit every page of the UI for XSS.
- Old bookings saved in a browser before this update have no key: they cannot be cancelled online.
- Existing photos stay in Supabase Storage (read-only) and keep working; a copy script to R2 can be added.
- `supabase/schema.sql` was not run against a real Postgres here; run it on a staging project first.
