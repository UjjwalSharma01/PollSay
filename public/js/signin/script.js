import { supabase } from '../../../src/config/supabase.js';

// Utility Functions
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validatePassword(password) {
    return password.length >= 8;
}

function showError(element, message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message text-red-500 text-sm mt-1';
    errorDiv.textContent = message;

    element.classList.add('form-input-error', 'border-red-500');
    element.parentNode.appendChild(errorDiv);
}

function clearErrors() {
    document.querySelectorAll('.error-message').forEach(err => err.remove());
    document.querySelectorAll('.form-input-error').forEach(input => {
        input.classList.remove('form-input-error', 'border-red-500');
    });
}

// DOMContentLoaded Event
document.addEventListener('DOMContentLoaded', () => {
    console.log("Sign-in script loaded, Supabase initialized");
    
    // Form handling
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');

    // Form submission handler
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearErrors();

        const email = emailInput.value.trim();
        const password = passwordInput.value;
        let isValid = true;

        if (!validateEmail(email)) {
            showError(emailInput, 'Please enter a valid email address');
            isValid = false;
        }

        if (!validatePassword(password)) {
            showError(passwordInput, 'Password must be at least 8 characters long');
            isValid = false;
        }

        if (isValid) {
            try {
                // Add loading state
                const submitButton = loginForm.querySelector('button[type="submit"]');
                submitButton.disabled = true;
                submitButton.innerHTML = `<svg class="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>Signing in...`;

                console.log('Attempting to sign in with:', { email });

                // Supabase authentication
                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });

                if (error) {
                    console.error('Sign in error:', error);
                    throw new Error(error.message || 'Login failed');
                }

                console.log('Sign in successful:', data);

                // Handle successful login - redirect to dashboard
                        
                console.log('Sign in successful:', data);
                
                // Check if user has any forms
                const { data: forms, error: formsError } = await supabase
                    .from('forms')
                    .select('id')
                    .eq('created_by', data.user.id)
                    .limit(1);
                
                if (formsError) {
                    console.error('Error checking forms:', formsError);
                }
                
                // Redirect based on forms existence
                if (forms && forms.length > 0) {
                    window.location.href = '/public/dashboard/index.html';
                } else {
                    window.location.href = '/public/formBuilder.html';
                }
                
            } catch (error) {
                console.error('Authentication error:', error);
                showError(emailInput, error.message);
            } finally {
                // Remove loading state
                const submitButton = loginForm.querySelector('button[type="submit"]');
                submitButton.disabled = false;
                submitButton.innerHTML = 'Sign in';
            }
        }
    });

    // Input validation on blur
    emailInput.addEventListener('blur', () => {
        clearErrors();
        if (emailInput.value && !validateEmail(emailInput.value)) {
            showError(emailInput, 'Please enter a valid email address');
        }
    });

    passwordInput.addEventListener('blur', () => {
        clearErrors();
        if (passwordInput.value && !validatePassword(passwordInput.value)) {
            showError(passwordInput, 'Password must be at least 8 characters long');
        }
    });
});