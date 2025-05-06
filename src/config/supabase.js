/**
 * Supabase client configuration
 * This file can be imported as a module or loaded as a regular script
 */

import ENV from './env.js';

// Check if we're in a module context or regular script
const isModule = typeof exports !== 'undefined' || 
                (typeof module !== 'undefined' && module.exports);

// Get Supabase credentials from environment
const SUPABASE_URL = ENV.SUPABASE_URL;
const SUPABASE_ANON_KEY = ENV.SUPABASE_ANON_KEY;

// Validate URL to prevent construction errors
function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch (e) {
    console.error("Invalid Supabase URL:", url);
    return false;
  }
}

// Create Supabase client
let supabase;

// Initialize in browser context
if (typeof window !== 'undefined') {
  // Check if we have valid credentials
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || 
      SUPABASE_URL === "__MISSING_SUPABASE_URL__" || 
      SUPABASE_ANON_KEY === "__MISSING_SUPABASE_ANON_KEY__") {
    console.error("Missing Supabase credentials. Please make sure env-config.js is properly loaded.");
    console.error("You need to run the generate-env-config.js script to create the env-config.js file.");
  } else if (window.supabase && window.supabase.createClient && isValidUrl(SUPABASE_URL)) {
    try {
      // Create client if supabase is loaded
      supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      
      // Make it globally available
      window.supabaseClient = supabase;
      console.log('Supabase client initialized successfully');
    } catch (error) {
      console.error('Error initializing Supabase client:', error);
    }
  } else {
    console.warn('Supabase not loaded yet or invalid URL. Make sure to include the Supabase CDN script before this file.');
    
    // Create a placeholder that will be initialized when Supabase loads
    window.addEventListener('supabase-loaded', function() {
      if (window.supabase && window.supabase.createClient && isValidUrl(SUPABASE_URL)) {
        try {
          supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
          window.supabaseClient = supabase;
          console.log('Supabase client initialized after lazy load');
        } catch (error) {
          console.error('Error initializing Supabase client after lazy load:', error);
        }
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
