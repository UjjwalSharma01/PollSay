/**
 * Direct initialization script
 * Add this to any page that needs immediate Supabase access
 */
(function() {
  console.log("Direct initialization script running");
  
  // Constants for Supabase
  const SUPABASE_URL = "https://hqrqmgamnjrpkvalaopl.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxcnFtZ2FtbmpycGt2YWxhb3BsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY3Njc2NDEsImV4cCI6MjA1MjM0MzY0MX0.oCAwphEjbuecQhWrhybc3q3fIjncvDIYJkjWTxxNjlg";

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
