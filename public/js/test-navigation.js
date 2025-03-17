// Simple test for navigation.js functionality
import { setupNavigationHandlers, enforceClickability } from './navigation.js';

document.addEventListener('DOMContentLoaded', () => {
  console.log('Testing navigation handlers...');
  
  // Create mock elements if they don't exist (for testing)
  if (!document.getElementById('user-avatar')) {
    const avatar = document.createElement('img');
    avatar.id = 'user-avatar';
    avatar.style.width = '40px';
    avatar.style.height = '40px';
    avatar.style.borderRadius = '50%';
    avatar.alt = 'User Avatar';
    avatar.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"%3E%3Ccircle cx="12" cy="12" r="10" fill="%23ccc"/%3E%3C/svg%3E';
    document.body.appendChild(avatar);
  }
  
  if (!document.getElementById('user-dropdown')) {
    const dropdown = document.createElement('div');
    dropdown.id = 'user-dropdown';
    dropdown.className = 'hidden';
    dropdown.style.padding = '10px';
    dropdown.style.backgroundColor = '#333';
    dropdown.style.color = 'white';
    dropdown.textContent = 'User Menu';
    document.body.appendChild(dropdown);
  }
  
  // Set up navigation handlers
  setupNavigationHandlers();
  enforceClickability();
  
  console.log('Navigation handlers set up successfully');
});
