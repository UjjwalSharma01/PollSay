/**
 * This script ensures Supabase is properly loaded before any other scripts
 * Add this to HTML files before other scripts that use Supabase
 */
(function() {
  // Check if Supabase is already loaded
  if (window.supabase) {
    console.log('Supabase already loaded');
    return;
  }
  
  // Load Supabase from CDN if not available
  const script = document.createElement('script');
  script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
  script.async = true;
  
  // Add load event listener
  script.addEventListener('load', () => {
    console.log('Supabase loaded successfully from CDN');
  });
  
  // Add error event listener
  script.addEventListener('error', (error) => {
    console.error('Failed to load Supabase from CDN:', error);
    alert('Failed to load necessary resources. Please check your internet connection and refresh the page.');
  });
  
  // Add the script to the document
  document.head.appendChild(script);
})();
