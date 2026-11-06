/* Talks to the Cloudflare Worker (payments + photo uploads). Loaded before api.js and kpverthyadmin.js.
   Nothing secret lives here: the Worker holds every key and re-checks every request. */
const CLOUD = (() => {
  const CFG = window.VERDANE_CONFIG;
  const ready = () => !!CFG.API_BASE && !/YOUR-/.test(CFG.API_BASE);

  async function request(path, { body, token, turnstile, raw, contentType } = {}) {
    if (!ready()) throw new Error('Online services are not configured yet (js/config.js: API_BASE).');
    const headers = {};
    if (token) headers.Authorization = 'Bearer ' + token;
    if (turnstile) headers['X-Turnstile-Token'] = turnstile;
    if (raw === undefined) headers['Content-Type'] = 'application/json'; else headers['Content-Type'] = contentType;
    let res;
    try {
      res = await fetch(CFG.API_BASE + path, { method: 'POST', headers, body: raw !== undefined ? raw : JSON.stringify(body || {}) });
    } catch (e) { throw new Error('Could not reach the server. Check your connection and try again.'); }
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const err = new Error((data && data.error && data.error.message) || 'Something went wrong. Please try again.');
      err.status = res.status; err.code = data && data.error && data.error.code; throw err;
    }
    return data;
  }

  /* Bot check. Renders an invisible Cloudflare Turnstile challenge and resolves with a one-time token. */
  let tsLoad;
  function loadTurnstile() {
    return tsLoad || (tsLoad = new Promise((ok, no) => {
      if (window.turnstile) return ok();
      const s = document.createElement('script');
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      s.async = true; s.onload = () => ok(); s.onerror = () => { tsLoad = null; no(new Error('Could not load the verification check.')); };
      document.head.append(s);
    }));
  }
  async function turnstileToken() {
    if (!CFG.TURNSTILE_SITEKEY || /YOUR-/.test(CFG.TURNSTILE_SITEKEY)) throw new Error('Verification is not configured yet (js/config.js: TURNSTILE_SITEKEY).');
    await loadTurnstile();
    return new Promise((ok, no) => {
      const box = document.createElement('div');
      box.style.cssText = 'position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:99999';
      document.body.append(box);
      const done = fn => v => { try { window.turnstile.remove(id); } catch (e) {} box.remove(); fn(v); };
      const id = window.turnstile.render(box, {
        sitekey: CFG.TURNSTILE_SITEKEY, appearance: 'interaction-only', size: 'flexible',
        callback: done(ok), 'error-callback': done(() => no(new Error('Verification failed. Please try again.'))),
        'timeout-callback': done(() => no(new Error('Verification expired. Please try again.')))
      });
    });
  }

  /* Upload one JPEG data-URL (already cropped in the browser) to R2 through the Worker. Returns the public URL. */
  async function uploadPhoto(dataUrl, scope, sbClient) {
    const blob = await (await fetch(dataUrl)).blob();
    let token, turnstile;
    if (scope === 'destination') turnstile = await turnstileToken();
    else { const { data } = await sbClient.auth.getSession(); token = data.session && data.session.access_token; if (!token) throw new Error('Please log in again.'); }
    const out = await request('/v1/uploads?scope=' + encodeURIComponent(scope), { raw: blob, contentType: blob.type || 'image/jpeg', token, turnstile });
    return out.url;
  }

  /* Best effort clean-up of photos that were removed from a listing. Never blocks saving. */
  async function deletePhotos(urls, sbClient) {
    try {
      const list = (urls || []).filter(u => typeof u === 'string' && u.startsWith('http')).slice(0, 10);
      if (!list.length) return;
      const { data } = await sbClient.auth.getSession(); const token = data.session && data.session.access_token; if (!token) return;
      await request('/v1/uploads/delete', { body: { urls: list }, token });
    } catch (e) { /* orphaned files are harmless */ }
  }

  /* Razorpay Checkout script, loaded only when someone reaches payment. */
  let rzLoad;
  function loadRazorpay() {
    return rzLoad || (rzLoad = new Promise((ok, no) => {
      if (window.Razorpay) return ok();
      const s = document.createElement('script');
      s.src = 'https://checkout.razorpay.com/v1/checkout.js'; s.async = true;
      s.onload = () => ok(); s.onerror = () => { rzLoad = null; no(new Error('Could not load the payment window. Check your connection.')); };
      document.head.append(s);
    }));
  }

  return { ready, request, turnstileToken, uploadPhoto, deletePhotos, loadRazorpay };
})();
