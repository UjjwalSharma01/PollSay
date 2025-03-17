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
        .single();

      if (orgError) throw orgError;
      orgId = orgData.org_id;

      const { data: keyData, error: keyError } = await supabase
        .from('organization_keys')
        .select('public_key')
        .eq('id', orgId)
        .single();

      if (!keyError && keyData) {
        // Organization already has keys
        orgPublicKey = keyData.public_key;
        toggleEncryptionBtn.disabled = false;
      } else {
        toggleEncryptionBtn.disabled = true;
        console.log("No encryption keys found. Visit encryption settings to set up keys.");
      }
    } catch (error) {
      console.error('Error setting up encryption:', error);
      alert('Could not check encryption status. You can try again later.');
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
      const isPublic = document.getElementById('form-is-public').checked;

      const formInsertData = {
        title: formData.title,
        description: formData.description,
        org_id: orgId,
        created_by: session.user.id,
        share_code: shareCode,
        metadata,
        is_public: isPublic
      };

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
        
        const { data, error } = await supabase.from('forms').insert([formInsertData]).select();
        
        if (error) throw error;
        
        showSuccessMessage(data[0], true);
      } else {
        // Save form without encryption
        formInsertData.encrypted = false;
        formInsertData.fields = formData.fields;
        
        const { data, error } = await supabase.from('forms').insert([formInsertData]).select();
        
        if (error) throw error;
        
        showSuccessMessage(data[0], false);
      }
    } catch (error) {
      console.error('Error saving form:', error);
      alert('Failed to save form: ' + error.message);
    }
  });

  function showSuccessMessage(formData, encrypted) {
    // Create success message
    const successMessage = document.createElement('div');
    successMessage.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-50';
    
    // Generate form URL
    const formUrl = `${window.location.origin}/public/form-response.html?id=${formData.id}`;
    
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
