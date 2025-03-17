/**
 * Shared navigation functionality for all PollSay dashboard pages
 */

export function setupNavigationHandlers() {
  document.addEventListener('DOMContentLoaded', () => {
    // User avatar dropdown toggle
    const userAvatar = document.getElementById('user-avatar');
    const userDropdown = document.getElementById('user-dropdown');
    
    if (userAvatar && userDropdown) {
      // First remove any existing handlers to prevent duplicates
      const newAvatar = userAvatar.cloneNode(true);
      userAvatar.parentNode.replaceChild(newAvatar, userAvatar);
      
      // Add click handler
      newAvatar.addEventListener('click', function(e) {
        e.stopPropagation();
        userDropdown.classList.toggle('hidden');
        console.log('Avatar clicked, dropdown toggled');
      });
    }
    
    // Close dropdown when clicking elsewhere
    document.addEventListener('click', function(e) {
      if (userDropdown && !e.target.closest('#user-avatar') && !e.target.closest('#user-dropdown')) {
        userDropdown.classList.add('hidden');
      }
    });
    
    // Active link highlighting
    const currentPath = window.location.pathname;
    document.querySelectorAll('aside nav a').forEach(link => {
      const linkPath = link.getAttribute('href');
      
      // Check if this link matches the current path
      if (linkPath && currentPath.includes(linkPath)) {
        link.classList.add('bg-mid', 'text-white');
        link.classList.remove('text-light', 'hover:bg-mid', 'hover:text-white');
      }
      
      // Ensure all links are clickable by checking and fixing href values
      if (!linkPath || linkPath === '#') {
        // Fix missing href values
        const linkText = link.textContent.trim().toLowerCase();
        switch (linkText) {
          case 'dashboard':
            link.href = '/public/dashboard/index.html';
            break;
          case 'analytics':
            link.href = '/public/dashboard/analytics.html';
            break;
          case 'forms':
            link.href = '/public/form-builder.html';
            break;
          case 'team':
            link.href = '/public/dashboard/team.html';
            break;
          case 'settings':
            link.href = '/public/dashboard/settings.html';
            break;
          default:
            link.href = '#';
        }
      }
    });
    
    // Log out handler
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        try {
          const { supabase } = await import('../src/config/supabase.js');
          await supabase.auth.signOut();
          window.location.href = '/public/signin.html';
        } catch (error) {
          console.error('Error signing out:', error);
        }
      });
    }
  });
}

/**
 * Make navigation elements interactive even if event listeners failed
 */
export function enforceClickability() {
  // Make sure clickable elements have proper cursor and z-index
  const style = document.createElement('style');
  style.textContent = `
    #user-avatar, aside nav a, button {
      cursor: pointer !important;
      position: relative; 
      z-index: 5;
    }
    
    #user-dropdown {
      z-index: 50 !important;
    }
    
    /* Debugging outline to show clickable areas */
    .debug-mode #user-avatar:hover, 
    .debug-mode aside nav a:hover,
    .debug-mode button:hover {
      outline: 2px solid #7C4DFF !important;
    }
  `;
  document.head.appendChild(style);
  
  // Add debug mode by URL parameter
  if (window.location.search.includes('debug=true')) {
    document.body.classList.add('debug-mode');
  }
}

/**
 * Navigate to a specific settings tab
 * @param {string} tab - The tab to navigate to (profile, account, security, notifications, data)
 */
export function navigateToSettings(tab) {
    window.location.href = `/public/dashboard/settings.html?tab=${tab}`;
}

// Export both functions as default
export default { setupNavigationHandlers, enforceClickability, navigateToSettings };
