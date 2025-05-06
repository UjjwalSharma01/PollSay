// This file ensures the environment variables are properly loaded
// in different environments (browser vs Node.js)

// Check if window.ENV exists (set by env-config.js in browser)
// or fallback to Node.js process.env
const ENV = {
  SUPABASE_URL: typeof window !== 'undefined' && window.ENV && window.ENV.SUPABASE_URL 
    ? window.ENV.SUPABASE_URL 
    : (typeof process !== 'undefined' && process.env.SUPABASE_URL || "__MISSING_SUPABASE_URL__"),
  
  SUPABASE_ANON_KEY: typeof window !== 'undefined' && window.ENV && window.ENV.SUPABASE_ANON_KEY 
    ? window.ENV.SUPABASE_ANON_KEY 
    : (typeof process !== 'undefined' && process.env.SUPABASE_ANON_KEY || "__MISSING_SUPABASE_ANON_KEY__")
};

export default ENV;