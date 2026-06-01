const { createClient } = require('@supabase/supabase-js');

let supabase = null;

const getSupabase = () => {
  if (supabase) return supabase;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key || url.includes('PLACEHOLDER')) {
    console.warn('[Supabase] Not configured — OTP auth disabled.');
    return null;
  }
  supabase = createClient(url, key);
  return supabase;
};

module.exports = { getSupabase };
