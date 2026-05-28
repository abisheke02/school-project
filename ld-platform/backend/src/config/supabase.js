const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

let supabase = null;

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase API credentials missing — auth via Supabase disabled');
} else {
  supabase = createClient(supabaseUrl, supabaseKey);
}

module.exports = { supabase };
