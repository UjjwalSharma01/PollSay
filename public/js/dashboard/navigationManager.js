/**
 * This file centralizes dashboard navigation management by importing from the main navigation.js
 * and re-exporting its functions with any dashboard-specific enhancements.
 */
import { setupNavigationHandlers, enforceClickability, navigateToSettings } from '../navigation.js';

// Re-export the main navigation functions
export { setupNavigationHandlers, enforceClickability, navigateToSettings };

/**
 * Dashboard-specific navigation initialization
 */
export function setupDashboardNavigation() {
  // First set up the standard navigation handlers
  setupNavigationHandlers();
  enforceClickability();
  
  // Then add dashboard-specific enhancements
  setupNotificationsIndicator();
  setupQuickActions();
}

/**
 * Setup notification indicators on the dashboard
 */
function setupNotificationsIndicator() {
  // Notification count handling
  const notificationBadge = document.querySelector('.notification-badge');
  if (notificationBadge) {
    fetch('/api/notifications/count')
      .then(response => response.json())
      .catch(() => ({ count: 0 }))
      .then(data => {
        if (data.count > 0) {
          notificationBadge.textContent = data.count > 99 ? '99+' : data.count;
          notificationBadge.classList.remove('hidden');
        }
      });
  }
}

/**
 * Setup quick action handlers
 */
function setupQuickActions() {
  // Quick action buttons in the dashboard
  const quickActionButtons = document.querySelectorAll('.quick-action');
  
  quickActionButtons.forEach(button => {
    button.addEventListener('click', () => {
      const action = button.getAttribute('data-action');
      
      switch (action) {
        case 'new-form':
          window.location.href = '/public/form-builder.html';
          break;
        case 'analytics':
          window.location.href = '/public/dashboard/analytics.html';
          break;
        case 'settings':
          window.location.href = '/public/dashboard/settings.html';
          break;
        default:
          console.log('Action not implemented:', action);
      }
    });
  });
}

export default {
  setupNavigationHandlers,
  enforceClickability,
  navigateToSettings,
  setupDashboardNavigation,
  setupNotificationsIndicator,
  setupQuickActions
};
