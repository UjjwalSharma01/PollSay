import { generateShareLink, updateFormAccessSettings } from '../formSharing.js';

/**
 * Initialize form sharing functionality
 * @param {string} formId The UUID of the form
 */
export function initFormSharing(formId) {
  // Get UI elements
  const shareButton = document.getElementById('shareFormButton');
  const shareModal = document.getElementById('shareModal');
  const shareUrlInput = document.getElementById('shareUrl');
  const copyUrlButton = document.getElementById('copyUrlButton');
  const requireLoginCheck = document.getElementById('requireLogin');
  const emailListContainer = document.getElementById('allowedEmailsContainer');
  const addEmailButton = document.getElementById('addEmailButton');
  const emailInput = document.getElementById('allowedEmailInput');
  const saveSettingsButton = document.getElementById('saveAccessSettings');
  const responseLimitInput = document.getElementById('responseLimit');
  
  // Set up event listeners
  if (shareButton) {
    shareButton.addEventListener('click', async () => {
      try {
        // Generate the share URL
        const shareUrl = await generateShareLink(formId);
        
        // Display in the modal
        if (shareUrlInput) {
          shareUrlInput.value = shareUrl;
        }
        
        // Show the modal
        if (shareModal) {
          shareModal.classList.remove('hidden');
        }
      } catch (error) {
        console.error('Error sharing form:', error);
        alert('Failed to generate share link. Please try again.');
      }
    });
  }
  
  // Copy URL button
  if (copyUrlButton && shareUrlInput) {
    copyUrlButton.addEventListener('click', () => {
      shareUrlInput.select();
      document.execCommand('copy');
      
      // Show copied confirmation
      const originalText = copyUrlButton.innerText;
      copyUrlButton.innerText = 'Copied!';
      setTimeout(() => {
        copyUrlButton.innerText = originalText;
      }, 2000);
    });
  }
  
  // Add email button
  if (addEmailButton && emailInput && emailListContainer) {
    addEmailButton.addEventListener('click', () => {
      const email = emailInput.value.trim();
      if (email && isValidEmail(email)) {
        addEmailToList(email, emailListContainer);
        emailInput.value = '';
      } else {
        alert('Please enter a valid email address');
      }
    });
  }
  
  // Save settings button
  if (saveSettingsButton) {
    saveSettingsButton.addEventListener('click', async () => {
      try {
        const requireLogin = requireLoginCheck ? requireLoginCheck.checked : false;
        const responseLimit = responseLimitInput && responseLimitInput.value ? 
          parseInt(responseLimitInput.value, 10) : null;
        
        // Get all emails from the list
        const allowedEmails = [];
        if (emailListContainer) {
          const emailItems = emailListContainer.querySelectorAll('.email-item');
          emailItems.forEach(item => {
            allowedEmails.push(item.dataset.email);
          });
        }
        
        // Update settings in the database
        await updateFormAccessSettings(formId, {
          requireLogin,
          allowedEmails: allowedEmails.length > 0 ? allowedEmails : null,
          responseLimit
        });
        
        alert('Access settings saved successfully');
      } catch (error) {
        console.error('Error saving access settings:', error);
        alert('Failed to save settings. Please try again.');
      }
    });
  }
  
  // Close modal button
  const closeButtons = document.querySelectorAll('[data-close-modal]');
  closeButtons.forEach(button => {
    button.addEventListener('click', () => {
      if (shareModal) {
        shareModal.classList.add('hidden');
      }
    });
  });
}

/**
 * Add an email to the allowed list
 * @param {string} email The email to add
 * @param {HTMLElement} container The container element
 */
function addEmailToList(email, container) {
  const emailItem = document.createElement('div');
  emailItem.className = 'email-item flex items-center justify-between p-2 bg-gray-100 rounded mb-2';
  emailItem.dataset.email = email;
  
  emailItem.innerHTML = `
    <span>${email}</span>
    <button type="button" class="remove-email text-red-500 hover:text-red-700">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
        <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
      </svg>
    </button>
  `;
  
  // Add remove button functionality
  const removeButton = emailItem.querySelector('.remove-email');
  if (removeButton) {
    removeButton.addEventListener('click', () => {
      emailItem.remove();
    });
  }
  
  container.appendChild(emailItem);
}

/**
 * Validate email format
 * @param {string} email The email to validate
 * @returns {boolean} Whether the email is valid
 */
function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}
