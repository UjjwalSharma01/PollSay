// This is a duplicate file with an incorrect path.
// You should use the main navigation.js file at /workspaces/PollSay/public/js/navigation.js instead.
// This file can be safely deleted, but for reference we're keeping its content updated to match the main file.

/**
 * Sets up navigation handlers for sidebar and common UI elements
 */
export function setupNavigationHandlers() {
  // User avatar dropdown toggle
  const userAvatar = document.getElementById('user-avatar');
  const userDropdown = document.getElementById('user-dropdown');
  
  if (userAvatar && userDropdown) {
    // First remove any existing handlers to prevent duplicates
    const newAvatar = userAvatar.cloneNode(true);
    if (userAvatar.parentNode) {
      userAvatar.parentNode.replaceChild(newAvatar, userAvatar);
    }
    
    // Add click handler
    newAvatar.addEventListener('click', function(e) {
      e.stopPropagation();
      userDropdown.classList.toggle('hidden');
      console.log('Avatar clicked, dropdown toggled');
    });
  }
  
  // Close dropdown when clicking elsewhere
  document.addEventListener('click', function(e) {
    const dropdown = document.getElementById('user-dropdown');
    const avatar = document.getElementById('user-avatar');
    if (dropdown && avatar && !avatar.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.add('hidden');
    }
  });
  
  // Active link highlighting
  const currentPath = window.location.pathname;
  document.querySelectorAll('aside nav a').forEach(link => {
    const linkPath = link.getAttribute('href');
    if (linkPath === currentPath || 
        (linkPath !== '/' && currentPath.startsWith(linkPath))) {
      link.classList.add('bg-mid', 'text-white');
      link.classList.remove('text-light', 'hover:bg-mid');
    }
  });
  
  // Responsive sidebar toggle
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const sidebar = document.querySelector('aside');
  
  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', () => {
      sidebar.classList.toggle('hidden');
    });
  }
}

/**
 * Enforces clickability for all buttons and links
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

// Export functions as named exports and as default object
export default { setupNavigationHandlers, enforceClickability, navigateToSettings };
