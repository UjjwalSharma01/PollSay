import { supabase } from '../../../src/config/supabase.js';
import { encryptionService } from '../services/encryptionService.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Check if user is logged in
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = '/public/signin.html';
    return;
  }

  const form = document.getElementById('form-builder');
  const titleInput = document.getElementById('form-title');
  const descriptionInput = document.getElementById('form-description');
  const fieldsContainer = document.getElementById('form-fields');
  const addFieldBtn = document.getElementById('add-field');
  const saveFormBtn = document.getElementById('save-form');
  const toggleEncryptionBtn = document.getElementById('toggle-encryption');
  const fieldTypes = document.querySelectorAll('.dropdown-content button');
  
  let encryptionEnabled = false;
  let orgPublicKey = null;
  let orgId = null;

  // Add new variables for access control
  let requireLogin = false;
  let allowedDomains = null;
  let allowedEmails = null;
  let responseLimit = null;
  let allowAllEmails = true;

  // Templates
  const textFieldTemplate = document.getElementById('text-field-template');
  const textareaFieldTemplate = document.getElementById('textarea-field-template');
  const multipleChoiceFieldTemplate = document.getElementById('multiple-choice-field-template');

  // Initialize by checking if org has encryption keys
  const initializeEncryption = async () => {
    try {
      // Check if org already has keys
      const { data: orgData, error: orgError } = await supabase
        .from('team_members')
        .select('org_id')
        .eq('user_id', session.user.id)
        .maybeSingle(); // Use maybeSingle instead of single to avoid error when no rows found

      if (orgError) throw orgError;
      
      // If no org data found, disable encryption and return early
      if (!orgData) {
        console.log("No organization found for this user");
        toggleEncryptionBtn.disabled = true;
        return;
      }
      
      orgId = orgData.org_id;

      const { data: keyData, error: keyError } = await supabase
        .from('organization_keys')
        .select('public_key')
        .eq('id', orgId)
        .maybeSingle(); // Use maybeSingle here too

      if (!keyError && keyData && keyData.public_key) {
        // Organization already has keys
        orgPublicKey = keyData.public_key;
        toggleEncryptionBtn.disabled = false;
      } else {
        toggleEncryptionBtn.disabled = true;
        console.log("No encryption keys found. Visit encryption settings to set up keys.");
      }
    } catch (error) {
      console.error('Error setting up encryption:', error);
      toggleEncryptionBtn.disabled = true; // Ensure button is disabled on error
    }
  };

  // Add field handlers
  fieldTypes.forEach(button => {
    button.addEventListener('click', () => {
      const fieldType = button.dataset.type;
      addField(fieldType);
    });
  });

  // Add a field to the form
  function addField(type) {
    let template;
    
    switch(type) {
      case 'text':
        template = textFieldTemplate;
        break;
      case 'textarea':
        template = textareaFieldTemplate;
        break;
      case 'multiple_choice':
        template = multipleChoiceFieldTemplate;
        break;
      default:
        console.error('Unknown field type:', type);
        return;
    }
    
    const field = template.content.cloneNode(true);
    fieldsContainer.appendChild(field);
    
    // Set up field event handlers
    const newField = fieldsContainer.lastElementChild;
    
    // Delete field button
    newField.querySelector('.delete-field').addEventListener('click', () => {
      newField.remove();
    });
    
    // Move up button
    newField.querySelector('.move-up').addEventListener('click', () => {
      const prev = newField.previousElementSibling;
      if (prev) {
        fieldsContainer.insertBefore(newField, prev);
      }
    });
    
    // Move down button
    newField.querySelector('.move-down').addEventListener('click', () => {
      const next = newField.nextElementSibling;
      if (next) {
        fieldsContainer.insertBefore(next, newField);
      }
    });
    
    // For multiple choice fields, set up option handling
    if (type === 'multiple_choice') {
      // Add option button
      newField.querySelector('.add-option').addEventListener('click', () => {
        const optionsContainer = newField.querySelector('.options-container');
        const optionItem = document.createElement('div');
        optionItem.className = 'option-item flex items-center';
        optionItem.innerHTML = `
          <span class="mr-3 text-gray-400"><i class="fas fa-circle text-xs"></i></span>
          <input type="text" class="option-input bg-transparent border-b border-gray-600 text-white focus:border-primary focus:outline-none" placeholder="New option" />
          <button class="delete-option text-gray-400 hover:text-red-500 transition-colors ml-2">
            <i class="fas fa-times"></i>
          </button>
        `;
        optionsContainer.appendChild(optionItem);
        
        // Set up delete option button
        optionItem.querySelector('.delete-option').addEventListener('click', () => {
          optionItem.remove();
        });
      });
      
      // Delete option buttons for existing options
      newField.querySelectorAll('.delete-option').forEach(button => {
        button.addEventListener('click', () => {
          // Don't delete if it's the last option
          const optionsContainer = newField.querySelector('.options-container');
          if (optionsContainer.children.length > 1) {
            button.closest('.option-item').remove();
          } else {
            alert('You must have at least one option');
          }
        });
      });
    }
  }

  // Toggle encryption on/off
  toggleEncryptionBtn.addEventListener('click', () => {
    if (toggleEncryptionBtn.disabled) return;
    
    encryptionEnabled = !encryptionEnabled;
    toggleEncryptionBtn.textContent = encryptionEnabled ? 
      'Encryption: ON' : 'Encryption: OFF';
    toggleEncryptionBtn.classList.toggle('bg-green-500', encryptionEnabled);
    toggleEncryptionBtn.classList.toggle('bg-gray-500', !encryptionEnabled);
  });

  // Save form with encryption if enabled
  saveFormBtn.addEventListener('click', async () => {
    try {
      // Validate form
      if (!titleInput.value.trim()) {
        alert('Please enter a form title');
        titleInput.focus();
        return;
      }
      
      if (fieldsContainer.children.length === 0) {
        alert('Please add at least one question');
        return;
      }
      
      // Collect form fields data
      const formFields = Array.from(fieldsContainer.children).map(field => {
        const fieldData = {
          type: field.dataset.type,
          question: field.querySelector('.question-text').value,
          required: field.querySelector('.required-toggle').checked
        };
        
        if (fieldData.type === 'multiple_choice') {
          fieldData.options = Array.from(field.querySelectorAll('.option-input'))
            .map(input => input.value)
            .filter(option => option.trim() !== '');
            
          if (fieldData.options.length === 0) {
            throw new Error('Multiple choice questions must have at least one option');
          }
        }
        
        return fieldData;
      });

      const formData = {
        title: titleInput.value,
        description: descriptionInput.value,
        fields: formFields,
      };

      // Collect access restrictions using prompt approach for now
      const accessSettings = await collectAccessSettings();
      if (!accessSettings) return; // User cancelled access settings

      // Generate a share code for the form
      const shareCode = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);

      // Extract metadata for analytics (non-sensitive info)
      const metadata = {
        questionCount: formFields.length,
        requiredFields: formFields.filter(f => f.required).length,
        types: formFields.reduce((acc, field) => {
          acc[field.type] = (acc[field.type] || 0) + 1;
          return acc;
        }, {})
      };

      // Check if form should be public
      const isPublic = document.getElementById('form-is-public')?.checked || false;

      // Create base form data with only guaranteed columns
      const formInsertData = {
        title: formData.title,
        description: formData.description,
        org_id: orgId,
        created_by: session.user.id,
        share_code: shareCode,
        metadata,
        is_public: isPublic
      };
      
      // Handle encryption-specific fields
      if (encryptionEnabled) {
        if (!orgPublicKey) {
          throw new Error('Encryption keys not set up. Please visit encryption settings first.');
        }
        
        // Generate form encryption key
        const { key, exportedKey } = await encryptionService.generateFormKey();
        
        // Encrypt the form key with organization's public key
        const encryptedFormKey = await encryptionService.encryptFormKey(
          exportedKey, 
          orgPublicKey
        );

        // Encrypt the form fields
        const encryptedFields = await encryptionService.encryptFormData(formData.fields, exportedKey);

        // Save form with encryption enabled
        formInsertData.encrypted = true;
        formInsertData.encrypted_form_key = encryptedFormKey;
        formInsertData.encrypted_fields = encryptedFields;
      } else {
        // Save form without encryption
        formInsertData.encrypted = false;
        formInsertData.fields = formData.fields;
      }

      // Try progressive approach to handle missing columns
      let result;
      let missingColumns = [];
      
      // Try first without any access control fields
      try {
        result = await supabase.from('forms').insert([formInsertData]).select();
        
        if (result.error) {
          throw result.error;
        }
        
        console.log("Saved form without access control fields.");
        
        // Form saved successfully, but access control settings not applied
        // Now try to update the form with access control settings one by one
        const updateData = {};
        
        // Try updating require_login
        try {
          await supabase.from('forms').update({ require_login: accessSettings.requireLogin })
            .eq('id', result.data[0].id);
        } catch (err) {
          missingColumns.push('require_login');
          console.warn("Column 'require_login' may be missing:", err.message);
        }
        
        // Try updating allowed_domains
        if (accessSettings.allowedDomains) {
          try {
            await supabase.from('forms').update({ allowed_domains: accessSettings.allowedDomains })
              .eq('id', result.data[0].id);
          } catch (err) {
            missingColumns.push('allowed_domains');
            console.warn("Column 'allowed_domains' may be missing:", err.message);
          }
        }
        
        // Try updating allowed_emails
        if (accessSettings.allowedEmails) {
          try {
            await supabase.from('forms').update({ allowed_emails: accessSettings.allowedEmails })
              .eq('id', result.data[0].id);
          } catch (err) {
            missingColumns.push('allowed_emails');
            console.warn("Column 'allowed_emails' may be missing:", err.message);
          }
        }
        
        // Try updating response_limit
        if (accessSettings.responseLimit) {
          try {
            await supabase.from('forms').update({ response_limit: accessSettings.responseLimit })
              .eq('id', result.data[0].id);
          } catch (err) {
            missingColumns.push('response_limit');
            console.warn("Column 'response_limit' may be missing:", err.message);
          }
        }
        
        // Try updating allow_all_emails
        try {
          await supabase.from('forms').update({ allow_all_emails: accessSettings.allowAllEmails })
            .eq('id', result.data[0].id);
        } catch (err) {
          missingColumns.push('allow_all_emails');
          console.warn("Column 'allow_all_emails' may be missing:", err.message);
        }
      }
      catch (error) {
        console.error("Failed to save form at all:", error);
        throw error;
      }
      
      // Store access settings in a separate forms_access_settings table
      // if too many columns are missing
      if (missingColumns.length > 0) {
        const warningMessage = `
Some access control fields are missing from your database schema. Your form was saved, 
but access controls may not be fully applied. Please run the following SQL to add the missing columns:

ALTER TABLE public.forms 
${missingColumns.includes('require_login') ? 'ADD COLUMN IF NOT EXISTS require_login BOOLEAN DEFAULT false,' : ''}
${missingColumns.includes('allowed_domains') ? 'ADD COLUMN IF NOT EXISTS allowed_domains TEXT[],' : ''}
${missingColumns.includes('allowed_emails') ? 'ADD COLUMN IF NOT EXISTS allowed_emails TEXT[],' : ''}
${missingColumns.includes('response_limit') ? 'ADD COLUMN IF NOT EXISTS response_limit INTEGER,' : ''}
${missingColumns.includes('allow_all_emails') ? 'ADD COLUMN IF NOT EXISTS allow_all_emails BOOLEAN DEFAULT true;' : ''}
`.trim().replace(/,$/, ';');
        
        console.warn(warningMessage);
        alert(`Form saved, but some access control settings couldn't be applied.\n\nPlease ask your database administrator to add the missing columns:\n${missingColumns.join(', ')}`);
      }
      
      // Show success message
      const formWithAccessSettings = {
        ...result.data[0],
        // Add the settings for the success message display
        require_login: accessSettings.requireLogin,
        allowed_domains: accessSettings.allowedDomains,
        response_limit: accessSettings.responseLimit
      };
      
      showSuccessMessage(formWithAccessSettings, encryptionEnabled);
    } catch (error) {
      console.error('Error saving form:', error);
      alert('Failed to save form: ' + error.message);
    }
  });

  // New function to collect access restrictions via prompts
  async function collectAccessSettings() {
    // Ask if email verification is required
    const requireVerification = confirm("Does this form require email verification?\n\nIf you click OK, respondents will need to verify their email to access the form.");
    
    // Start with base restrictions
    const settings = {
      requireLogin: requireVerification,
      allowAllEmails: true,
      allowedDomains: null,
      allowedEmails: null,
      responseLimit: null
    };
    
    // If verification required, ask about domain restrictions
    if (requireVerification) {
      const useDomainRestriction = confirm("Do you want to restrict access to specific email domains?\n\nFor example, only allow emails from 'company.com'.");
      
      if (useDomainRestriction) {
        const domain = prompt("Enter the email domain to allow (e.g., 'company.com'):");
        if (domain && domain.trim() !== '') {
          settings.allowedDomains = [domain.trim()];
          settings.allowAllEmails = false;
        }
      }
      
      const useSpecificEmails = confirm("Do you want to allow specific email addresses to access this form?");
      
      if (useSpecificEmails) {
        const emailsInput = prompt("Enter email addresses separated by commas:");
        if (emailsInput && emailsInput.trim() !== '') {
          const emails = emailsInput.split(',').map(email => email.trim()).filter(email => email);
          if (emails.length > 0) {
            settings.allowedEmails = emails;
            settings.allowAllEmails = false;
          }
        }
      }
      
      const useResponseLimit = confirm("Do you want to limit the number of responses per user?");
      
      if (useResponseLimit) {
        const limit = prompt("Enter maximum number of responses per user:");
        const parsedLimit = parseInt(limit);
        if (!isNaN(parsedLimit) && parsedLimit > 0) {
          settings.responseLimit = parsedLimit;
        }
      }
    }
    
    // Show preview of selected settings
    const settingsSummary = `Form Access Settings:
    - Email verification: ${settings.requireLogin ? 'Required' : 'Not required'}
    ${settings.allowedDomains ? `- Allowed domains: ${settings.allowedDomains.join(', ')}` : ''}
    ${settings.allowedEmails ? `- Allowed emails: ${settings.allowedEmails.join(', ')}` : ''}
    ${settings.responseLimit ? `- Response limit: ${settings.responseLimit} per user` : ''}
    ${settings.allowAllEmails && settings.requireLogin ? '- Any verified email can access' : ''}
    ${!settings.requireLogin ? '- Anyone can access (no restrictions)' : ''}`;
    
    const confirmSettings = confirm(`${settingsSummary}\n\nAre these settings correct?`);
    
    if (confirmSettings) {
      return settings;
    } else {
      // Start over or cancel
      const retry = confirm("Would you like to set access controls again? Click Cancel to stop form creation.");
      if (retry) {
        return await collectAccessSettings();
      } else {
        return null; // User cancelled
      }
    }
  }

  function showSuccessMessage(formData, encrypted) {
    // Create success message
    const successMessage = document.createElement('div');
    successMessage.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-50';
    
    // Generate form URL
    const formUrl = `${window.location.origin}/public/form-response.html?id=${formData.id}`;
    
    // Add access control information to success message
    const accessControlInfo = formData.require_login ? 
      `<div class="bg-blue-500/20 border border-blue-500/30 text-blue-200 rounded-lg p-4 text-sm mt-3">
        <p><i class="fas fa-user-lock mr-2"></i> <strong>Access controls enabled:</strong> This form requires email verification${formData.allowed_domains ? `, from domain ${formData.allowed_domains.join(', ')}` : ''}${formData.response_limit ? `, limited to ${formData.response_limit} responses per user` : ''}.</p>
      </div>` : '';
    
    successMessage.innerHTML = `
      <div class="bg-dark rounded-xl p-8 max-w-lg w-full">
        <div class="text-center mb-6">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 text-primary mb-4">
            <i class="fas fa-check text-3xl"></i>
          </div>
          <h2 class="text-2xl font-bold">Form Created Successfully!</h2>
        </div>
        
        <div class="space-y-4">
          <div>
            <p class="text-light mb-2">Your form is now available at:</p>
            <div class="flex items-center">
              <input type="text" value="${formUrl}" id="form-url" readonly class="flex-1 bg-mid border-none rounded-l-lg px-3 py-2 text-white focus:outline-none">
              <button onclick="navigator.clipboard.writeText('${formUrl}')" class="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-r-lg">
                <i class="fas fa-copy"></i>
              </button>
            </div>
          </div>
          
          ${encrypted ? `
          <div class="bg-yellow-500/20 border border-yellow-500/30 text-yellow-200 rounded-lg p-4 text-sm">
            <p><i class="fas fa-lock mr-2"></i> This form is <strong>end-to-end encrypted</strong>. Responses will only be viewable by authorized organization members with the decryption key.</p>
          </div>
          ` : ''}
          
          ${accessControlInfo}
          
          <div class="flex justify-between mt-6">
            <button id="create-another" class="px-4 py-2 bg-dark border border-light/20 hover:bg-mid rounded-lg text-white transition-colors">
              Create Another Form
            </button>
            <button id="view-dashboard" class="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors">
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(successMessage);
    
    // Add event listeners for buttons
    document.getElementById('create-another').addEventListener('click', () => {
      successMessage.remove();
      resetForm();
    });
    
    document.getElementById('view-dashboard').addEventListener('click', () => {
      window.location.href = '/public/dashboard/index.html';
    });
  }

  function resetForm() {
    titleInput.value = '';
    descriptionInput.value = '';
    fieldsContainer.innerHTML = '';
    encryptionEnabled = false;
    toggleEncryptionBtn.textContent = 'Encryption: OFF';
    toggleEncryptionBtn.classList.remove('bg-green-500');
    toggleEncryptionBtn.classList.add('bg-gray-500');
  }

  // Initialize form builder
  await initializeEncryption();
});
