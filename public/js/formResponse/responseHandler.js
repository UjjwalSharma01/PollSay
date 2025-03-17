import { supabase } from '../../../src/config/supabase.js';
import { encryptionService } from '../services/encryptionService.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Get form ID from URL query parameter
  const urlParams = new URLSearchParams(window.location.search);
  const formId = urlParams.get('id');
  const shareCode = urlParams.get('code');
  
  if (!formId && !shareCode) {
    displayError('Invalid form link - missing form ID or share code');
    return;
  }
  
  const formContainer = document.getElementById('form-container');
  const loadingIndicator = document.getElementById('loading-indicator');
  const emailVerificationContainer = document.getElementById('email-verification');
  const formContentContainer = document.getElementById('form-content');
  
  let formData;
  let isEncrypted = false;
  let formKey;
  let formFieldsData; // Changed from formFields to formFieldsData to avoid conflict
  
  const startTime = Date.now(); // Track time for completion metrics
  
  try {
    console.log("Attempting to load form...");
    
    // First try: fetch by form ID if provided
    let query = supabase.from('forms').select('*');
    
    if (formId) {
      query = query.eq('id', formId);
    } else if (shareCode) {
      query = query.eq('share_code', shareCode);
    }
    
    const { data, error } = await query.maybeSingle(); // Use maybeSingle to avoid error if not found
    
    if (error) {
      console.error("Database query error:", error);
      throw error;
    }
    
    if (!data) {
      console.log("Form not found with primary query, trying alternative approach...");
      
      // Second try: If form ID query failed, try by share code or vice versa
      if (shareCode && !formId) {
        // Try fetching with share_code directly as exact match
        const { data: shareData, error: shareError } = await supabase
          .from('forms')
          .select('*')
          .eq('share_code', shareCode)
          .single();
        
        if (!shareError && shareData) {
          formData = shareData;
        } else {
          throw new Error("Form not found with share code");
        }
      } else if (formId) {
        // Try an RPC call as a last resort if available
        try {
          const { data: rpcData, error: rpcError } = await supabase
            .rpc('get_form_by_id', { p_form_id: formId });
            
          if (!rpcError && rpcData && rpcData.length > 0) {
            formData = rpcData[0];
          } else {
            throw new Error("Form not found via RPC");
          }
        } catch (rpcFallbackError) {
          // If RPC doesn't exist, this is our final fallback
          console.error("RPC fallback failed:", rpcFallbackError);
          throw new Error("Form not found");
        }
      } else {
        throw new Error("Form not found");
      }
    } else {
      formData = data;
    }
    
    if (!formData) {
      throw new Error("Failed to load form data");
    }
    
    // Form found - proceed with display
    console.log("Form loaded successfully:", formData.id);
    isEncrypted = formData.encrypted;
    
    // Check if email verification is required
    if (formData.require_verification) {
      loadingIndicator.classList.add('hidden');
      emailVerificationContainer.classList.remove('hidden');
      setupEmailVerification();
    } else {
      // No verification required, render form directly
      loadingIndicator.classList.add('hidden');
      await renderForm();
      formContentContainer.classList.remove('hidden');
    }
  } catch (err) {
    console.error('Error loading form:', err);
    displayError('Failed to load the form. It may have been deleted or the link is invalid.');
  }
  
  function setupEmailVerification() {
    const verifyEmailBtn = document.getElementById('verify-email');
    const emailInput = document.getElementById('email-input');
    
    verifyEmailBtn.addEventListener('click', async () => {
      const email = emailInput.value;
      
      if (!email || !isValidEmail(email)) {
        showEmailError('Please enter a valid email address');
        return;
      }
      
      try {
        // Check if email is authorized for this form
        const { data, error } = await supabase
          .from('allowed_respondents')
          .select('*')
          .eq('form_id', formData.id)
          .eq('email', email)
          .single();
          
        if (error || !data) {
          showEmailError('This email is not authorized to access this form');
          return;
        }
        
        // Email is verified, generate pseudonym
        const pseudonym = await encryptionService.generatePseudonym(email, formData.org_id);
        
        // Store in session storage for form submission
        sessionStorage.setItem('respondent_email', email);
        sessionStorage.setItem('respondent_pseudonym', pseudonym);
        
        // Show form content
        emailVerificationContainer.classList.add('hidden');
        await renderForm();
        formContentContainer.classList.remove('hidden');
      } catch (err) {
        console.error('Email verification error:', err);
        showEmailError('Verification failed. Please try again.');
      }
    });
  }
  
  async function renderForm() {
    const formTitle = document.getElementById('form-title');
    const formDescription = document.getElementById('form-description');
    const formFieldsContainer = document.getElementById('form-fields');
    
    formTitle.textContent = formData.title;
    formDescription.textContent = formData.description;
    
    // Handle encrypted form
    if (isEncrypted) {
      try {
        // In a real implementation, we would need the org's private key
        // here we'll use the already decrypted fields for simplicity
        const encryptedFields = formData.encrypted_fields || formData.fields;
        formFieldsData = typeof encryptedFields === 'string' ? 
          JSON.parse(encryptedFields) : encryptedFields;
      } catch (err) {
        console.error('Error processing form fields:', err);
        displayError('This form cannot be displayed properly.');
        return;
      }
    } else {
      formFieldsData = formData.fields;
    }
    
    // Map field types to ensure compatibility with formBuilder
    formFieldsData = formFieldsData.map(field => {
      // Check if the type needs to be mapped
      if (field.field_type_key) {
        // Already has mapped type - use it
        field.type = field.field_type_key;
      } else if (field.type === 'short-text') {
        field.type = 'text';
      } else if (field.type === 'long-text') {
        field.type = 'textarea';
      } else if (field.type === 'multiple-choice') {
        field.type = 'multiple_choice';
      }
      // Ensure options array exists
      if (!Array.isArray(field.options)) {
        field.options = [];
      }
      return field;
    });
    
    // Render form fields
    renderFormFields(formFieldsData, formContentContainer);
    
    // Set up form submission handler
    setupFormSubmission(formFieldsData);
  }
  
  function renderFormFields(fields, container) {
    const formFieldsElement = document.getElementById('form-fields');
    formFieldsElement.innerHTML = ''; // Clear any existing fields
    
    fields.forEach((field, index) => {
      const fieldElement = document.createElement('div');
      fieldElement.className = 'mb-6 p-4 bg-white rounded-xl shadow field-entrance';
      fieldElement.dataset.fieldIndex = index;
      
      const questionText = document.createElement('h3');
      questionText.className = 'text-lg font-medium mb-2 text-gray-800';
      questionText.textContent = field.question;
      
      if (field.required) {
        const requiredSpan = document.createElement('span');
        requiredSpan.className = 'text-red-500 ml-1';
        requiredSpan.textContent = '*';
        questionText.appendChild(requiredSpan);
      }
      
      if (field.helpText) {
        const helpTextElement = document.createElement('p');
        helpTextElement.className = 'text-sm text-gray-500 mb-2';
        helpTextElement.textContent = field.helpText;
        fieldElement.appendChild(questionText);
        fieldElement.appendChild(helpTextElement);
      } else {
        fieldElement.appendChild(questionText);
      }
      
      // Create input based on field type - compatible with formBuilder types
      switch (field.type) {
        case 'text':
          const textInput = document.createElement('input');
          textInput.type = 'text';
          textInput.className = 'w-full p-2 border border-gray-300 rounded';
          textInput.required = field.required;
          fieldElement.appendChild(textInput);
          break;
          
        case 'multiple_choice':
          if (field.options && field.options.length) {
            field.options.forEach((option, optIndex) => {
              const wrapper = document.createElement('div');
              wrapper.className = 'flex items-center mb-2 option-entrance';
              setTimeout(() => wrapper.classList.remove('option-entrance'), 300);
              
              const radio = document.createElement('input');
              radio.type = 'radio';
              radio.name = `field-${index}`;
              radio.id = `option-${index}-${optIndex}`;
              radio.value = option;
              radio.required = field.required;
              radio.className = 'mr-2 text-primary';
              
              const label = document.createElement('label');
              label.htmlFor = `option-${index}-${optIndex}`;
              label.textContent = option;
              label.className = 'text-gray-700';
              
              wrapper.appendChild(radio);
              wrapper.appendChild(label);
              fieldElement.appendChild(wrapper);
            });
          } else {
            const noOptionsMsg = document.createElement('p');
            noOptionsMsg.className = 'text-sm text-red-500';
            noOptionsMsg.textContent = 'This question has no options defined.';
            fieldElement.appendChild(noOptionsMsg);
          }
          break;
          
        case 'checkbox':
          if (field.options && field.options.length) {
            field.options.forEach((option, optIndex) => {
              const wrapper = document.createElement('div');
              wrapper.className = 'flex items-center mb-2 option-entrance';
              setTimeout(() => wrapper.classList.remove('option-entrance'), 300);
              
              const check = document.createElement('input');
              check.type = 'checkbox';
              check.name = `field-${index}[]`;
              check.id = `option-${index}-${optIndex}`;
              check.value = option;
              check.className = 'mr-2 text-primary';
              
              const label = document.createElement('label');
              label.htmlFor = `option-${index}-${optIndex}`;
              label.textContent = option;
              label.className = 'text-gray-700';
              
              wrapper.appendChild(check);
              wrapper.appendChild(label);
              fieldElement.appendChild(wrapper);
            });
          } else {
            const noOptionsMsg = document.createElement('p');
            noOptionsMsg.className = 'text-sm text-red-500';
            noOptionsMsg.textContent = 'This checkbox question has no options defined.';
            fieldElement.appendChild(noOptionsMsg);
          }
          break;
          
        case 'textarea':
          const textarea = document.createElement('textarea');
          textarea.className = 'w-full p-2 border border-gray-300 rounded';
          textarea.rows = 4;
          textarea.required = field.required;
          fieldElement.appendChild(textarea);
          break;
        
        default:
          console.warn(`Unknown field type "${field.type}" - defaulting to text input`);
          const defaultInput = document.createElement('input');
          defaultInput.type = 'text';
          defaultInput.className = 'w-full p-2 border border-gray-300 rounded';
          defaultInput.required = field.required;
          fieldElement.appendChild(defaultInput);
      }
      
      // Remove entrance animation after a delay
      setTimeout(() => fieldElement.classList.remove('field-entrance'), 500);
      formFieldsElement.appendChild(fieldElement);
    });
    
    // Create the name visibility div and add it properly
    const nameVisibilityDiv = document.createElement('div');
    nameVisibilityDiv.className = 'mb-6 p-4 bg-white rounded-xl shadow';
    
    // We'll use direct DOM creation rather than innerHTML to avoid potential issues
    const flexContainer = document.createElement('div');
    flexContainer.className = 'flex items-center';
    
    // Create checkbox with proper event handling
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = 'show-real-name';
    checkbox.className = 'mr-2';
    
    // Improved checkbox handling to fix name resolution issue
    checkbox.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      // Toggle checked state manually
      this.checked = !this.checked;
      
      // Update the visual state and add a data attribute for tracking
      if(this.checked) {
        this.setAttribute('checked', 'checked');
        this.setAttribute('data-checked', 'true');
      } else {
        this.removeAttribute('checked');
        this.setAttribute('data-checked', 'false');
      }
      
      console.log('Checkbox state toggled:', this.checked);
      return false;
    });
    
    // Create label and make it update the checkbox correctly
    const label = document.createElement('label');
    label.htmlFor = 'show-real-name';
    label.className = 'text-gray-800';
    label.textContent = 'Show my real name instead of pseudonym';
    
    // Make the label also toggle the checkbox with improved handling
    label.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      // Manually toggle the checkbox
      const cb = document.getElementById('show-real-name');
      if (cb) {
        cb.checked = !cb.checked;
        
        // Update data-checked attribute for state tracking
        if(cb.checked) {
          cb.setAttribute('checked', 'checked');
          cb.setAttribute('data-checked', 'true');
        } else {
          cb.removeAttribute('checked');
          cb.setAttribute('data-checked', 'false');
        }
        
        console.log('Checkbox toggled by label, now:', cb.checked);
      }
      return false;
    });
    
    // Add description text
    const description = document.createElement('p');
    description.className = 'text-sm text-gray-500 mt-1';
    description.textContent = 'If unchecked, your response will be anonymous with a pseudonym.';
    
    // Assemble the elements
    flexContainer.appendChild(checkbox);
    flexContainer.appendChild(label);
    nameVisibilityDiv.appendChild(flexContainer);
    nameVisibilityDiv.appendChild(description);
    
    formFieldsElement.appendChild(nameVisibilityDiv);
    
    // Add submit button
    const submitButtonDiv = document.createElement('div');
    submitButtonDiv.className = 'mt-8';
    submitButtonDiv.innerHTML = `
      <button type="submit" class="w-full bg-primary hover:bg-primary/90 text-white py-3 px-6 rounded-xl font-medium transition-colors">
        Submit Response
      </button>
    `;
    
    container.querySelector('form').appendChild(submitButtonDiv);
  }
  
  function setupFormSubmission(fields) {
    const responseForm = document.getElementById('response-form');
    responseForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      try {
        // Collect responses with improved field type handling
        const responses = [];
        Array.from(document.getElementById('form-fields').children).forEach((fieldElement, index) => {
          if (!fieldElement.dataset.fieldIndex) return; // Skip if not a question field
          
          const fieldIndex = parseInt(fieldElement.dataset.fieldIndex);
          const field = fields[fieldIndex];
          
          if (!field) {
            console.warn(`Field at index ${fieldIndex} not found in fields array`);
            return;
          }
          
          let value;
          
          switch (field.type) {
            case 'text':
              value = fieldElement.querySelector('input').value;
              break;
              
            case 'multiple_choice':
              const selected = fieldElement.querySelector('input:checked');
              value = selected ? selected.value : null;
              break;
              
            case 'checkbox':
              // Handle multiple selected checkboxes
              const checked = Array.from(fieldElement.querySelectorAll('input:checked'));
              value = checked.map(cb => cb.value);
              break;
              
            case 'textarea':
              value = fieldElement.querySelector('textarea').value;
              break;
              
            default:
              console.warn(`Unknown field type: ${field.type}, using text extraction`);
              const input = fieldElement.querySelector('input, textarea');
              value = input ? input.value : null;
          }
          
          responses.push({
            question: field.question,
            answer: value,
            type: field.type,
            required: field.required
          });
        });
        
        // Calculate completion time
        const completionTime = Math.floor((Date.now() - startTime) / 1000);
        
        // Get respondent info from session if available - Fixed potential null issues
        const email = sessionStorage.getItem('respondent_email') || null;
        const pseudonym = sessionStorage.getItem('respondent_pseudonym') || null;
        
        // Enhanced checkbox state detection with multiple fallbacks
        const checkbox = document.getElementById('show-real-name');
        let showRealName = false;
        
        if (checkbox) {
          // Check multiple properties to ensure we capture the state correctly
          showRealName = checkbox.checked || 
                         checkbox.getAttribute('checked') === 'checked' || 
                         checkbox.getAttribute('data-checked') === 'true' ||
                         checkbox.classList.contains('real-name-checked');
                         
          console.log('Checkbox detection details:', {
            'property.checked': checkbox.checked,
            'attr.checked': checkbox.getAttribute('checked'),
            'data-checked': checkbox.getAttribute('data-checked'),
            'classList': checkbox.classList.contains('real-name-checked')
          });
        }
        
        console.log('Using name display mode:', showRealName ? 'real name' : 'pseudonym');
        
        if (isEncrypted) {
          // For encrypted forms
          try {
            // Create encryption response data with safety checks
            const encryptedResponseData = { 
              responses, 
              timestamp: new Date().toISOString()
            };
            
            if (email && showRealName) {
              encryptedResponseData.email = email;
            }
            
            // Request data with safety checks
            const requestData = {
              form_id: formData.id,
              completion_time: completionTime,
              encrypted_data: JSON.stringify(encryptedResponseData)
            };
            
            // Only add these fields if we have values
            if (showRealName && email) requestData.respondent_email = email;
            if (!showRealName && pseudonym) requestData.respondent_pseudonym = pseudonym;
            if (typeof showRealName === 'boolean') requestData.show_real_name = showRealName;
            
            // Submit to database with error handling
            const { data, error } = await supabase.from('encrypted_responses')
              .insert([requestData])
              .select();
            
            if (error) {
              console.error('Encrypted response submission error:', error);
              throw new Error(`Database error: ${error.message}`);
            }
            
            console.log('Encrypted response submitted successfully:', data);
          } catch (err) {
            console.error('Error submitting encrypted response:', err);
            throw err;
          }
        } else {
          // For unencrypted forms - use absolute minimal data to avoid any schema issues
          const minimalResponseData = {
            form_id: formData.id,
            responses: responses,
            completion_time: completionTime,
            show_real_name: showRealName // Explicitly include this field
          };
          
          // Only add these fields if they have valid values to prevent errors
          if (showRealName && email) minimalResponseData.respondent_email = email;
          if (!showRealName && pseudonym) minimalResponseData.respondent_pseudonym = pseudonym;
          
          console.log('Submitting form response with minimal data:', minimalResponseData);
          
          // Try submitting with only the essential fields first
          try {
            const { data, error } = await supabase
              .from('form_responses')
              .insert([minimalResponseData]);
            
            if (error) {
              console.error('Minimal submission failed, error details:', error);
              throw error;
            }
            
            console.log('Form response submitted successfully');
          } catch (initialError) {
            console.error('Initial submission failed, trying anonymous auth:', initialError);
            
            // Try again without authentication as fallback
            const { data: publicData, error: publicError } = await supabase.auth.signOut();
            
            const { data, error } = await supabase
              .from('form_responses')
              .insert([minimalResponseData]);
              
            if (error) {
              console.error('Anonymous submission also failed:', error);
              throw new Error(`Form submission failed: ${error.message}`);
            }
          }
        }
        
        // Show success message
        formContentContainer.classList.add('hidden');
        document.getElementById('success-message').classList.remove('hidden');
        
      } catch (err) {
        console.error('Error submitting response:', err);
        alert(`Failed to submit your response: ${err.message}. Please refresh and try again.`);
        
        // Log additional diagnostic info for debugging
        console.log('Form ID:', formData.id);
        console.log('Is form encrypted:', isEncrypted);
        console.log('User session:', await supabase.auth.getSession());
      }
    });
  }
  
  function displayError(message) {
    loadingIndicator.classList.add('hidden');
    const errorElement = document.getElementById('error-message');
    errorElement.classList.remove('hidden');
    errorElement.innerHTML = `
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-6">
        <i class="fas fa-exclamation-triangle text-red-500 text-3xl"></i>
      </div>
      <h2 class="text-2xl font-bold mb-4">Oops!</h2>
      <p class="text-gray-600 mb-6">${message}</p>
      <a href="/public/dashboard/index.html" class="px-6 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition-all">
        Go to Dashboard
      </a>
    `;
  }
  
  function showEmailError(message) {
    const errorElement = document.getElementById('email-error');
    errorElement.textContent = message;
    errorElement.classList.remove('hidden');
  }
  
  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
});
