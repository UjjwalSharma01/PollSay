/**
 * Supabase client configuration
 * This file can be imported as a module or loaded as a regular script
 */

// Check if we're in a module context or regular script
const isModule = typeof exports !== 'undefined' || 
                (typeof module !== 'undefined' && module.exports);

// Define Supabase credentials
const SUPABASE_URL = "https://hqrqmgamnjrpkvalaopl.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxcnFtZ2FtbmpycGt2YWxhb3BsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY3Njc2NDEsImV4cCI6MjA1MjM0MzY0MX0.oCAwphEjbuecQhWrhybc3q3fIjncvDIYJkjWTxxNjlg";

// Create Supabase client
let supabase;

// Initialize in browser context
if (typeof window !== 'undefined') {
  if (window.supabase && window.supabase.createClient) {
    // Create client if supabase is loaded
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Make it globally available
    window.supabaseClient = supabase;
  } else {
    console.warn('Supabase not loaded yet. Make sure to include the Supabase CDN script before this file.');
    
    // Create a placeholder that will be initialized when Supabase loads
    window.addEventListener('supabase-loaded', function() {
      if (window.supabase && window.supabase.createClient) {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        window.supabaseClient = supabase;
        console.log('Supabase client initialized after lazy load');
      }
    });
  }
}

// For module usage
if (typeof exports !== 'undefined') {
  exports.SUPABASE_URL = SUPABASE_URL;
  exports.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;
  exports.supabase = supabase;
}

// For ES modules
export { supabase, SUPABASE_URL, SUPABASE_ANON_KEY };
