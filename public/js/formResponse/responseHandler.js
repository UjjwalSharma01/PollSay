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
      fieldElement.className = 'mb-6 p-4 bg-white rounded-xl shadow';
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
      
      fieldElement.appendChild(questionText);
      
      // Create input based on field type
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
              wrapper.className = 'flex items-center mb-2';
              
              const radio = document.createElement('input');
              radio.type = 'radio';
              radio.name = `field-${index}`;
              radio.id = `option-${index}-${optIndex}`;
              radio.value = option;
              radio.required = field.required;
              radio.className = 'mr-2';
              
              const label = document.createElement('label');
              label.htmlFor = `option-${index}-${optIndex}`;
              label.textContent = option;
              label.className = 'text-gray-700';
              
              wrapper.appendChild(radio);
              wrapper.appendChild(label);
              fieldElement.appendChild(wrapper);
            });
          }
          break;
          
        case 'textarea':
          const textarea = document.createElement('textarea');
          textarea.className = 'w-full p-2 border border-gray-300 rounded';
          textarea.rows = 4;
          textarea.required = field.required;
          fieldElement.appendChild(textarea);
          break;
      }
      
      formFieldsElement.appendChild(fieldElement);
    });
    
    // Add name visibility option
    const nameVisibilityDiv = document.createElement('div');
    nameVisibilityDiv.className = 'mb-6 p-4 bg-white rounded-xl shadow';
    nameVisibilityDiv.innerHTML = `
      <div class="flex items-center">
        <input type="checkbox" id="show-real-name" class="mr-2">
        <label for="show-real-name" class="text-gray-800">Show my real name instead of pseudonym</label>
      </div>
      <p class="text-sm text-gray-500 mt-1">
        If unchecked, your response will be anonymous with a pseudonym.
      </p>
    `;
    
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
        // Collect responses
        const responses = [];
        Array.from(document.getElementById('form-fields').children).forEach((fieldElement, index) => {
          if (!fieldElement.dataset.fieldIndex) return; // Skip if not a question field
          
          const fieldIndex = parseInt(fieldElement.dataset.fieldIndex);
          const field = fields[fieldIndex];
          
          let value;
          
          switch (field.type) {
            case 'text':
              value = fieldElement.querySelector('input').value;
              break;
              
            case 'multiple_choice':
              const selected = fieldElement.querySelector('input:checked');
              value = selected ? selected.value : null;
              break;
              
            case 'textarea':
              value = fieldElement.querySelector('textarea').value;
              break;
          }
          
          responses.push({
            question: field.question,
            answer: value,
            type: field.type
          });
        });
        
        // Calculate completion time
        const completionTime = Math.floor((Date.now() - startTime) / 1000);
        
        // Get respondent info from session if available
        const email = sessionStorage.getItem('respondent_email') || null;
        const pseudonym = sessionStorage.getItem('respondent_pseudonym') || null;
        const showRealName = document.getElementById('show-real-name')?.checked || false;
        
        if (isEncrypted) {
          // For encrypted forms
          try {
            // Create encryption response data
            const encryptedResponseData = { 
              responses, 
              timestamp: new Date().toISOString(),
              email: showRealName ? email : null
            };
            
            // In a real implementation, the form's public key would be used here
            const { data, error } = await supabase.from('encrypted_responses').insert({
              form_id: formData.id,
              respondent_email: showRealName ? email : null,
              respondent_pseudonym: showRealName ? null : pseudonym,
              show_real_name: showRealName,
              completion_time: completionTime,
              encrypted_data: JSON.stringify(encryptedResponseData)
            }).select();
            
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
            responses: responses
          };
          
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
