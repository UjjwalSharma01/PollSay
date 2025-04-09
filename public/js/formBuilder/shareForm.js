import { supabase } from '../../../src/config/supabase.js';

// Function to update form access settings
export async function updateFormAccessSettings(formId, settings) {
  if (!formId) throw new Error('Form ID is required');
  
  const { requireLogin = false, allowedEmails = null, responseLimit = null, allowedDomains = null } = settings;
  
  // Determine if all emails are allowed (when no restrictions are set)
  const allowAllEmails = !allowedEmails && !allowedDomains;
  
  try {
    const { data, error } = await supabase
      .from('forms')
      .update({
        require_login: requireLogin,
        allowed_emails: allowedEmails,
        response_limit: responseLimit,
        allowed_domains: allowedDomains,
        allow_all_emails: allowAllEmails
      })
      .eq('id', formId);
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating form access settings:', error);
    throw error;
  }
}

// Initialize form sharing UI and event handlers
export function initFormSharing(formId, shareCode) {
  // Setup the UI elements
  const settingsContainer = document.getElementById('form-share-settings');
  if (!settingsContainer) return;
  
  const requireLoginCheck = document.getElementById('requireLogin');
  const emailListContainer = document.getElementById('allowedEmailsContainer');
  const addEmailButton = document.getElementById('addEmailButton');
  const emailInput = document.getElementById('allowedEmailInput');
  const saveSettingsButton = document.getElementById('saveAccessSettings');
  const responseLimitInput = document.getElementById('responseLimit');
  const domainInput = document.getElementById('allowedDomain');
  const formLinkInput = document.getElementById('formShareLink');
  
  // Set the share link if we have one
  if (formLinkInput && shareCode) {
    const baseUrl = window.location.origin;
    const shareLink = `${baseUrl}/public/form-response.html?code=${shareCode}`;
    formLinkInput.value = shareLink;
    
    // Add copy link button functionality
    const copyLinkButton = document.getElementById('copyLinkButton');
    if (copyLinkButton) {
      copyLinkButton.addEventListener('click', () => {
        formLinkInput.select();
        document.execCommand('copy');
        // Show temporary copied message
        copyLinkButton.textContent = 'Copied!';
        setTimeout(() => {
          copyLinkButton.textContent = 'Copy Link';
        }, 2000);
      });
    }
  }
  
  // Add email to list
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
        
        // Get domain if provided
        const allowedDomain = domainInput && domainInput.value ? 
          domainInput.value.trim() : null;
        
        // Format domain (remove @ if present)
        let formattedDomain = null;
        if (allowedDomain) {
          formattedDomain = allowedDomain.startsWith('@') ? 
            [allowedDomain.substring(1)] : [allowedDomain];
        }
        
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
          responseLimit,
          allowedDomains: formattedDomain
        });
        
        alert('Access settings saved successfully');
      } catch (error) {
        console.error('Error saving access settings:', error);
        alert('Failed to save settings. Please try again.');
      }
    });
  }
  
  // Load existing settings
  loadFormSettings(formId);
}

// Helper function to add email to the list
function addEmailToList(email, container) {
  const item = document.createElement('div');
  item.className = 'email-item flex items-center space-x-2 bg-mid/20 p-2 rounded mb-2';
  item.dataset.email = email;
  
  item.innerHTML = `
    <span class="text-textColor">${email}</span>
    <button type="button" class="remove-email text-red-500 hover:text-red-700">
      <i class="fas fa-times"></i>
    </button>
  `;
  
  item.querySelector('.remove-email').addEventListener('click', () => {
    item.remove();
  });
  
  container.appendChild(item);
}

// Helper function to validate email format
function isValidEmail(email) {
  const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
}

// Load existing form settings
async function loadFormSettings(formId) {
  try {
    const { data, error } = await supabase
      .from('forms')
      .select('require_login, allowed_emails, response_limit, allowed_domains, allow_all_emails')
      .eq('id', formId)
      .single();
      
    if (error) throw error;
    
    // Update UI with existing settings
    const requireLoginCheck = document.getElementById('requireLogin');
    const responseLimitInput = document.getElementById('responseLimit');
    const domainInput = document.getElementById('allowedDomain');
    const emailListContainer = document.getElementById('allowedEmailsContainer');
    
    if (requireLoginCheck) requireLoginCheck.checked = data.require_login || false;
    if (responseLimitInput) responseLimitInput.value = data.response_limit || '';
    
    // Set domain if available
    if (domainInput && data.allowed_domains && data.allowed_domains.length > 0) {
      domainInput.value = data.allowed_domains[0];
    }
    
    // Add emails to the list
    if (emailListContainer && data.allowed_emails && data.allowed_emails.length > 0) {
      emailListContainer.innerHTML = '';
      data.allowed_emails.forEach(email => {
        addEmailToList(email, emailListContainer);
      });
    }
    
  } catch (error) {
    console.error('Error loading form settings:', error);
  }
}
