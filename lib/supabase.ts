/* lib/supabase.ts
   Supabase browser client for the app.
   Make sure to set these environment variables in Vercel (or locally):
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
*/

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

if (!supabaseUrl || !supabaseAnonKey) {
  // Do not throw here; allow app to build. Runtime will show auth errors if not configured.
  console.warn(
    "Supabase environment variables are not set: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // persistSession is only meaningful in browser environment
    persistSession: true,
    // storeRefreshToken is recommended when using refresh tokens
    // (works together with persistSession)
    storeRefreshToken: true,
  },
});
