const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase API credentials missing in backend .env');
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = { supabase };
