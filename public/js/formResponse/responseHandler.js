import { supabase } from '../../../src/config/supabase.js';
import { encryptionService } from '../services/encryptionService.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Get form ID from URL query parameter
  const urlParams = new URLSearchParams(window.location.search);
  const formId = urlParams.get('id');
  const shareCode = urlParams.get('code');
  
  if (!formId && !shareCode) {
    displayError('Invalid form link');
    return;
  }
  
  const formContainer = document.getElementById('form-container');
  const loadingIndicator = document.getElementById('loading-indicator');
  const emailVerificationContainer = document.getElementById('email-verification');
  const formContentContainer = document.getElementById('form-content');
  
  let formData;
  let isEncrypted = false;
  let formKey;
  let formFields;
  
  const startTime = Date.now(); // Track time for completion metrics
  
  try {
    // Fetch form data
    const { data, error } = await supabase
      .from('forms')
      .select('*')
      .or(`id.eq.${formId},share_code.eq.${shareCode}`)
      .single();
      
    if (error) throw error;
    
    formData = data;
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
    const formFields = document.getElementById('form-fields');
    
    formTitle.textContent = formData.title;
    formDescription.textContent = formData.description;
    
    // Handle encrypted form
    if (isEncrypted) {
      try {
        // In a real implementation, we would need the org's private key
        // here we'll use the already decrypted fields for simplicity
        const encryptedFields = formData.encrypted_fields || formData.fields;
        formFields = typeof encryptedFields === 'string' ? 
          JSON.parse(encryptedFields) : encryptedFields;
      } catch (err) {
        console.error('Error processing form fields:', err);
        displayError('This form cannot be displayed properly.');
        return;
      }
    } else {
      formFields = formData.fields;
    }
    
    // Render form fields
    renderFormFields(formFields, formContentContainer);
    
    // Set up form submission handler
    setupFormSubmission(formFields);
  }
  
  function renderFormFields(fields, container) {
    const formFieldsElement = document.getElementById('form-fields');
    
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
            // Create response data
            const responseData = { 
              responses, 
              timestamp: new Date().toISOString(),
              email: showRealName ? email : null  // Only include email if showRealName is true
            };
            
            // In a real implementation, the form's public key would be used here
            // For now, we'll save with minimal encryption to demonstrate the pattern
            const { data, error } = await supabase.from('encrypted_responses').insert({
              form_id: formData.id,
              respondent_email: showRealName ? email : null,
              respondent_pseudonym: showRealName ? null : pseudonym,
              show_real_name: showRealName,
              completion_time: completionTime,
              encrypted_data: JSON.stringify(responseData) // In a real implementation, this would be encrypted
            });
            
            if (error) throw error;
          } catch (err) {
            console.error('Error submitting encrypted response:', err);
            throw err;
          }
        } else {
          // For unencrypted forms
          const { error } = await supabase.from('form_responses').insert({
            form_id: formData.id,
            responses,
            respondent_email: showRealName ? email : null,
            respondent_pseudonym: showRealName ? null : pseudonym,
            completion_time: completionTime,
            display_mode: showRealName ? 'real' : 'pseudonym'
          });
          
          if (error) throw error;
        }
        
        // Show success message
        formContentContainer.classList.add('hidden');
        document.getElementById('success-message').classList.remove('hidden');
        
      } catch (err) {
        console.error('Error submitting response:', err);
        alert('Failed to submit your response. Please try again.');
      }
    });
  }
  
  function displayError(message) {
    loadingIndicator.classList.add('hidden');
    const errorElement = document.getElementById('error-message');
    errorElement.textContent = message;
    errorElement.classList.remove('hidden');
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
