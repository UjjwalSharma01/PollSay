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
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;

    element.classList.add('form-input-error');
    element.parentNode.appendChild(errorDiv);
}

function clearErrors() {
    document.querySelectorAll('.error-message').forEach(err => err.remove());
    document.querySelectorAll('.form-input-error').forEach(input => {
        input.classList.remove('form-input-error');
    });
}
import { supabase } from '../../../src/config/supabase.js';
// DOMContentLoaded Event
document.addEventListener('DOMContentLoaded', () => {
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
                loginForm.classList.add('loading');

                // Supabase authentication
                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });

                if (error) {
                    throw new Error(error.message || 'Login failed');
                }

                // Handle successful login
                window.location.href = '/dashboard';

            } catch (error) {
                showError(emailInput, error.message);
            } finally {
                loginForm.classList.remove('loading');
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