/* Project settings. The Supabase anon key is safe to expose: access is enforced by Row Level Security (see supabase/schema.sql).
   NEVER put a Razorpay secret, a webhook secret or the Supabase service-role key in this file: those live only in the Worker. */
   window.VERDANE_CONFIG = {
    SUPABASE_URL: 'https://kvrqszlphfvbkezotbod.supabase.co',
    SUPABASE_ANON_KEY: 'sb_publishable_vbAM1BI7mKeqKw3p0WFrJA_K3d0Wg-I',
    /* TODO: URL of the deployed Cloudflare Worker (payments + photo uploads). No trailing slash. */
    API_BASE: 'https://verdane-api.adilkp.workers.dev',
    /* TODO: Cloudflare Turnstile SITE key (public). Used to stop bots on checkout and on visitor photo uploads. */
    TURNSTILE_SITEKEY: '0x4AAAAAAF2AjYJXZ7753WNg',
    /* TODO: your WhatsApp number with country code, digits only (e.g. 919876543210). The footer "Contact" link opens a chat with this number. */
    WHATSAPP_NUMBER: '919207271076',
    WHATSAPP_MESSAGE: 'Hi Verdane, I need help with'
  };
  