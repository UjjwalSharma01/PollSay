/**
 * Direct initialization script
 * Add this to any page that needs immediate Supabase access
 */
(function() {
  console.log("Direct initialization script running");
  
  // Constants for Supabase - using window.ENV if available or placeholder values
  // IMPORTANT: This script should be loaded AFTER env-config.js
  const SUPABASE_URL = (window.ENV && window.ENV.SUPABASE_URL) || "__MISSING_SUPABASE_URL__";
  const SUPABASE_ANON_KEY = (window.ENV && window.ENV.SUPABASE_ANON_KEY) || "__MISSING_SUPABASE_ANON_KEY__";

  // Check if either URL or key is missing
  if (SUPABASE_URL === "__MISSING_SUPABASE_URL__" || SUPABASE_ANON_KEY === "__MISSING_SUPABASE_ANON_KEY__") {
    console.error("Missing Supabase credentials. Make sure env-config.js is loaded before this script.");
  }

  // Check if Supabase is already defined
  if (window.supabase) {
    console.log("Supabase already exists, creating client");
    if (!window.supabaseClient) {
      window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    return;
  }

  // Otherwise, load Supabase
  console.log("Loading Supabase from CDN");
  const script = document.createElement('script');
  script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
  script.onload = () => {
    console.log("Supabase loaded, creating client");
    window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Dispatch event to notify that Supabase is ready
    const event = new CustomEvent('supabase-ready');
    window.dispatchEvent(event);
  };
  document.head.appendChild(script);
})();
