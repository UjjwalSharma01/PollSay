/**
 * This is a fallback script that will initialize the settings page
 * if the module scripts fail to load correctly
 */
(function() {
  console.log('Settings fallback script loaded');
  
  // Check if the settings module loaded correctly
  setTimeout(() => {
    const profileForm = document.getElementById('profile-form');
    const tabButtons = document.querySelectorAll('.tab-button');
    
    // Check if Supabase is available
    if (!window.supabase) {
      console.warn('Fallback: Supabase not found, attempting to load it');
      const script = document.createElement('script');
      script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
      script.onload = () => {
        console.log('Supabase loaded by fallback script');
        initializeFallbackSupabase();
      };
      document.head.appendChild(script);
    } else {
      console.log('Fallback: Supabase found, checking if initialization is needed');
      initializeFallbackSupabase();
    }
    
    // Initialize Supabase fallback client if needed
    function initializeFallbackSupabase() {
      if (window.supabase && !window.fallbackInitialized) {
        try {
          console.log('Creating fallback Supabase client');
          const SUPABASE_URL = "https://hqrqmgamnjrpkvalaopl.supabase.co";
          const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxcnFtZ2FtbmpycGt2YWxhb3BsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY3Njc2NDEsImV4cCI6MjA1MjM0MzY0MX0.oCAwphEjbuecQhWrhybc3q3fIjncvDIYJkjWTxxNjlg";
          window.fallbackClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
          window.fallbackInitialized = true;
          
          setupTabSwitching();
          setupProfileForm();
        } catch (err) {
          console.error('Fallback: Failed to create Supabase client:', err);
        }
      } else {
        setupTabSwitching();
      }
    }
    
    // Setup tab switching functionality
    function setupTabSwitching() {
      tabButtons.forEach(button => {
        if (!button._hasClickListener) {
          button.addEventListener('click', () => {
            // Remove active class from all tabs
            tabButtons.forEach(btn => {
              btn.classList.remove('active', 'border-primary');
              btn.classList.add('border-transparent');
            });
            
            // Add active class to clicked tab
            button.classList.add('active', 'border-primary');
            button.classList.remove('border-transparent');
            
            // Show corresponding content
            const tabContents = document.querySelectorAll('.tab-content');
            tabContents.forEach(content => {
              content.classList.add('hidden');
            });
            
            const tabId = button.getAttribute('data-tab');
            const tabContent = document.getElementById(`${tabId}-tab`);
            if (tabContent) tabContent.classList.remove('hidden');
          });
          button._hasClickListener = true;
        }
      });
      
      console.log('Fallback: Tab switching set up');
    }
    
    // Setup basic profile form functionality
    function setupProfileForm() {
      if (profileForm && !profileForm._hasEvents && window.fallbackClient) {
        profileForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          
          try {
            const { data: { session } } = await window.fallbackClient.auth.getSession();
            if (!session) {
              window.location.href = '/public/signin.html';
              return;
            }
            
            const { error } = await window.fallbackClient
                .from('profiles')
                .update({
                    full_name: document.getElementById('full-name').value,
                    display_name: document.getElementById('display-name').value,
                    job_title: document.getElementById('job-title').value,
                    department: document.getElementById('department').value,
                    bio: document.getElementById('bio').value
                })
                .eq('id', session.user.id);

            if (error) throw error;
            
            alert('Profile updated successfully!');
          } catch (error) {
            console.error('Error updating profile:', error);
            alert('Failed to update profile. Please try again.');
          }
        });
        
        profileForm._hasEvents = true;
        console.log('Fallback: Profile form handler set up');
      }
    }
  }, 800);
})();
