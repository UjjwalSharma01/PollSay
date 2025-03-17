import { supabase } from '../../../src/config/supabase.js';

// Define utility functions outside the DOMContentLoaded event
function validateEmail(email) {
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    console.log(`Email validation for ${email}: ${isValid}`);
    return isValid;
}

function checkPasswordStrength(password) {
    console.log('Checking password strength');
    const strength = {
        length: password.length >= 8,
        hasUpperCase: /[A-Z]/.test(password),
        hasLowerCase: /[a-z]/.test(password),
        hasNumbers: /\d/.test(password),
        hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };
    const strengthScore = Object.values(strength).filter(Boolean).length;
    console.log(`Password strength score: ${strengthScore}/5`);
    return { strength, strengthScore };
}

async function uploadFileToSupabase(file) {
    console.log('Uploading file to Supabase storage');
    const fileName = `${Date.now()}-${file.name}`;
    try {
        const { data, error } = await supabase.storage
            .from('organization-files')
            .upload(fileName, file);
        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Supabase upload error:', error);
        return { data: null, error };
    }
}

console.log("Initializing form handler...");

document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM fully loaded, Supabase initialized");

    const form = document.getElementById('multi-step-form');
    const steps = document.querySelectorAll('.form-step');
    const nextBtns = document.querySelectorAll('.next-step');
    const prevBtns = document.querySelectorAll('.prev-step');
    const addMemberBtn = document.querySelector('.add-member');
    const loadingOverlay = document.getElementById('loadingOverlay');
    let currentStep = 0;
    let autoSaveTimeout;
    let formData = {
        organization: {},
        security: {},
        team: { members: [] }
    };

    function setLoading(isLoading) {
        console.log(`Setting loading state: ${isLoading}`);
        loadingOverlay.classList.toggle('hidden', !isLoading);
    }

    function showToast(message, type = 'success') {
        console.log(`Showing toast: ${message} (${type})`);
        const toast = document.getElementById('toast');
        toast.className = `fixed top-4 right-4 max-w-md p-4 rounded-xl shadow-lg transform transition-all duration-300 ${
            type === 'success' ? 'bg-green-500' : 'bg-red-500'
        } text-white`;
        toast.textContent = message;
        toast.classList.remove('scale-0');
        setTimeout(() => toast.classList.add('scale-0'), 3000);
    }

    function showError(element, message) {
        console.log(`Showing error for ${element.id}: ${message}`);
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message text-red-500 text-sm mt-1';
        errorDiv.textContent = message;
        element.parentNode.appendChild(errorDiv);
        element.classList.add('border-red-500');
    }

    function clearError(element) {
        console.log(`Clearing error for ${element.id}`);
        const errorDiv = element.parentNode.querySelector('.error-message');
        if (errorDiv) {
            errorDiv.remove();
        }
        element.classList.remove('border-red-500');
    }

    async function saveStepData(step) {
        console.log(`Saving data for step ${step}`);
        try {
            switch (step) {
                case 0:
                    formData.organization = {
                        email: document.getElementById('email').value,
                        org_name: document.getElementById('orgName').value,      // Changed to snake_case
                        org_size: document.getElementById('orgSize').value,      // Changed to snake_case
                        industry: document.getElementById('industry').value
                    };
                    console.log("Organization data:", formData.organization);
                    break;
                case 1:
                    formData.security = {
                        password: document.getElementById('password').value,
                        twoFactorEnabled: false // Placeholder for future implementation
                    };
                    console.log("Security data saved (password hidden)");
                    break;
                case 2:
                    formData.team = {
                        defaultRole: document.getElementById('defaultRole').value,
                        members: Array.from(document.querySelectorAll('.team-member'))
                            .map(member => member.dataset.email)
                    };
                    console.log("Team data:", formData.team);
                    break;
            }
        } catch (error) {
            console.error(`Error saving data for step ${step}:`, error);
            throw error;
        }
    }

    // Define which steps are optional (0-based index)
    const optionalSteps = [2]; // Step 3 is optional
    async function validateStep(step) {
        console.log(`Validating step ${step}`);
    
        // Skip validation for optional steps
        if (optionalSteps.includes(step)) {
            console.log(`Step ${step} is optional. Skipping validation.`);
            return true;
        }
    
        // Clear existing error messages in the current step
        const currentStepElement = steps[step];
        currentStepElement.querySelectorAll('.error-message').forEach(errorDiv => errorDiv.remove());
        currentStepElement.querySelectorAll('.border-red-500').forEach(input => input.classList.remove('border-red-500'));
    
        // Collect all input and select elements in the current step
        const currentInputs = currentStepElement.querySelectorAll('input, select');
        let isValid = true;
    
        for (let input of currentInputs) {
            if (input.type === 'checkbox') {
                console.log(`Skipping validation for checkbox: ${input.id}`);
                continue;
            }
            console.log(`Validating ${input.id}: ${input.value ? 'has value' : 'empty'}`);
            if (!input.value.trim()) {
                isValid = false;
                showError(input, 'This field is required');
            } else {
                clearError(input);
            }
        }
    
        // Additional validation for Step 2 (Security Setup)
        if (step === 1) { // Step 2 is index 1
            const passwordInput = currentStepElement.querySelector('#password');
            const confirmPasswordInput = currentStepElement.querySelector('#confirmPassword');
            if (passwordInput && confirmPasswordInput) {
                const password = passwordInput.value;
                const confirmPassword = confirmPasswordInput.value;
                console.log('Validating password match');
                if (password !== confirmPassword) {
                    isValid = false;
                    showError(confirmPasswordInput, 'Passwords do not match');
                    console.log('Password validation failed: mismatch');
                }
    
                // Validate password strength
                const { strength, strengthScore } = checkPasswordStrength(password);
                if (strengthScore < 4) { // Assuming 4 is the minimum acceptable score
                    isValid = false;
                    // Generate specific error messages based on failed criteria
                    Object.keys(strength).forEach(key => {
                        if (!strength[key]) {
                            let message = '';
                            switch (key) {
                                case 'length':
                                    message = '• At least 8 characters long';
                                    break;
                                case 'hasUpperCase':
                                    message = '• Include at least one uppercase letter';
                                    break;
                                case 'hasLowerCase':
                                    message = '• Include at least one lowercase letter';
                                    break;
                                case 'hasNumbers':
                                    message = '• Include at least one number';
                                    break;
                                case 'hasSpecialChar':
                                    message = '• Include at least one special character (e.g., !@#$%)';
                                    break;
                                default:
                                    message = '• Meet the required criteria';
                            }
                            showError(passwordInput, `Password requirements not met:\n${message}`);
                        }
                    });
                    console.log('Password strength validation failed');
                }
            }
        }
    
        console.log(`Step ${step} validation result: ${isValid}`);
        return isValid;
    }

    function addTeamMember(email) {
        const membersList = document.querySelector('.team-members-list');
        console.log(`Creating team member element for ${email}`);
        const memberElement = document.createElement('div');
        memberElement.className = 'team-member flex items-center justify-between p-4 bg-dark border-2 border-primary/10 rounded-xl group hover:border-primary/30 transition-all duration-300';
        memberElement.dataset.email = email;
        memberElement.innerHTML = `
            <span class="text-gray-300">${email}</span>
            <button type="button" class="text-gray-400 hover:text-red-500 transition-colors duration-300">×</button>
        `;
        membersList.appendChild(memberElement);
        console.log(`Team member added, total members: ${membersList.children.length}`);
        memberElement.querySelector('button').addEventListener('click', () => {
            console.log(`Removing team member: ${email}`);
            memberElement.remove();
        });
    }

    function displaySummary() {
        console.log('Generating summary display');
        const org = formData.organization;
        const security = formData.security;
        const team = formData.team;
    
        document.getElementById('orgSummary').innerHTML = `
            <p><strong>Email:</strong> ${org.email}</p>
            <p><strong>Organization:</strong> ${org.org_name}</p>
            <p><strong>Size:</strong> ${org.org_size}</p>
            <p><strong>Industry:</strong> ${org.industry}</p>
        `;
        document.getElementById('securitySummary').innerHTML = `
            <p><strong>Two-Factor Authentication:</strong> ${security.twoFactorEnabled ? 'Enabled' : 'Disabled'}</p>
        `;
        document.getElementById('teamSummary').innerHTML = `
            <p><strong>Default Role:</strong> ${team.defaultRole}</p>
            <p><strong>Team Members:</strong> ${team.members.length}</p>
            ${team.members.length > 0 ? team.members.map(email => `<p>- ${email}</p>`).join('') : '<p>No team members added.</p>'}
        `;
    }

    function checkPasswordStrengthAndUpdate(event) {
        const password = event.target.value;
        const strengthScore = checkPasswordStrength(password);
        updatePasswordStrengthUI(strengthScore);
    }

    function updatePasswordStrengthUI(score) {
        const strengthIndicator = document.querySelector('.password-strength');
        if (!strengthIndicator) return;
        const strengthClasses = {
            1: 'bg-red-500',
            2: 'bg-orange-500',
            3: 'bg-yellow-500',
            4: 'bg-blue-500',
            5: 'bg-green-500'
        };
        strengthIndicator.className = `password-strength h-1 transition-all duration-300 ${strengthClasses[score] || 'bg-gray-300'}`;
        strengthIndicator.style.width = `${score * 20}%`;
    }

    function updateStepIndicators(stepIndex) {
        console.log(`Updating step indicators for step ${stepIndex}`);
        const indicators = document.querySelectorAll('.step-indicator');
        indicators.forEach((indicator, index) => {
            indicator.classList.toggle('active', index <= stepIndex);
            indicator.classList.toggle('completed', index < stepIndex);
        });
    }

    async function initializeFileUploads() {
        const fileInputs = document.querySelectorAll('input[type="file"]');
        fileInputs.forEach(input => {
            input.addEventListener('change', async (e) => {
                console.log('File upload detected');
                const file = e.target.files[0];
                if (file) {
                    try {
                        setLoading(true);
                        const { data, error } = await uploadFileToSupabase(file);
                        if (error) throw error;
                        console.log('File uploaded successfully:', data);
                        showToast('File uploaded successfully');
                    } catch (err) {
                        console.error('File upload error:', err);
                        showToast('File upload failed', 'error');
                    } finally {
                        setLoading(false);
                    }
                }
            });
        });
    }

    function initializeAutoSave() {
        console.log('Initializing auto-save functionality');
        form.addEventListener('input', () => {
            clearTimeout(autoSaveTimeout);
            autoSaveTimeout = setTimeout(async () => {
                console.log('Auto-saving form data');
                try {
                    await saveStepData(currentStep);
                    showToast('Progress saved', 'success');
                } catch (error) {
                    console.error('Auto-save error:', error);
                }
            }, 2000);
        });
    }

    function initializeOfflineSupport() {
        console.log('Initializing offline support');
        window.addEventListener('online', () => {
            console.log('Application is online');
            showToast('You are back online');
            syncOfflineData();
        });
        window.addEventListener('offline', () => {
            console.log('Application is offline');
            showToast('You are offline. Changes will be saved locally', 'warning');
        });
    }

    async function syncOfflineData() {
        console.log('Syncing offline data');
        const offlineData = localStorage.getItem('offlineFormData');
        if (offlineData) {
            try {
                const parsedData = JSON.parse(offlineData);
                await saveFormDataToSupabase(parsedData);
                localStorage.removeItem('offlineFormData');
                console.log('Offline data synced successfully');
            } catch (error) {
                console.error('Error syncing offline data:', error);
            }
        }
    }

    async function saveFormDataToSupabase(data) {
        console.log('Saving form data to Supabase');
        try {
            const { error } = await supabase
                .from('form_data')
                .upsert(data);
            if (error) throw error;
            console.log('Data saved successfully');
        } catch (error) {
            console.error('Error saving to Supabase:', error);
            throw error;
        }
    }

    // Step Navigation
    nextBtns.forEach((btn) => {
        btn.addEventListener('click', async () => {
            console.log(`Next button clicked on step ${currentStep}`);
            try {
                if (await validateStep(currentStep)) {
                    console.log(`Step ${currentStep} validation passed`);
                    await saveStepData(currentStep);
                    
                    // Hide current step
                    steps[currentStep].classList.remove('active');
                    steps[currentStep].classList.add('hidden');
                    
                    // Move to next step
                    currentStep++;
                    
                    // Show next step
                    steps[currentStep].classList.remove('hidden');
                    steps[currentStep].classList.add('active');
                    
                    updateStepIndicators(currentStep);
                    console.log(`Moved to step ${currentStep}`);
                    
                    if (currentStep === steps.length - 1) {
                        console.log("Reached final step, displaying summary");
                        displaySummary();
                    }
                } else {
                    console.log(`Step ${currentStep} validation failed`);
                }
            } catch (error) {
                console.error("Error during step navigation:", error);
                showToast('An error occurred during navigation', 'error');
            }
        });
    });
    
    prevBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            console.log(`Moving back from step ${currentStep}`);
            
            // Hide current step
            steps[currentStep].classList.remove('active');
            steps[currentStep].classList.add('hidden');
            
            // Move to previous step
            currentStep--;
            
            // Show previous step
            steps[currentStep].classList.remove('hidden');
            steps[currentStep].classList.add('active');
            
            updateStepIndicators(currentStep);
            console.log(`Returned to step ${currentStep}`);
        });
    });

    // Add team members
    if (addMemberBtn) {
        addMemberBtn.addEventListener('click', () => {
            console.log('Add member button clicked');
            const emailInput = document.getElementById('teamEmail');
            const email = emailInput.value;
            if (validateEmail(email)) {
                console.log(`Adding team member: ${email}`);
                addTeamMember(email);
                emailInput.value = '';
            } else {
                console.log(`Invalid email format: ${email}`);
                showError(emailInput, 'Please enter a valid email');
            }
        });
    }

    // Form Submission - Updated to use RLS
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('Form submission initiated');
        if (!document.getElementById('termsAccept').checked) {
            console.log('Terms not accepted');
            showError(document.getElementById('termsAccept'), 'Please accept the terms');
            return;
        }
        
        try {
            setLoading(true);
            
            // 1. Create the user account first
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: formData.organization.email,
                password: formData.security.password,
                options: {
                    data: {
                        // We'll update this with org_id after creating the org
                    }
                }
            });
            
            if (authError) throw authError;
            
            // 2. Create the organization record
            const { data: org, error: orgError } = await supabase
                .from('organizations')
                .insert([{
                    email: formData.organization.email,
                    org_name: formData.organization.org_name,
                    org_size: formData.organization.org_size,
                    industry: formData.organization.industry,
                    created_by: authData.user.id
                }])
                .select()
                .single();
                
            if (orgError) throw orgError;
            
            // 3. Update user's metadata with org_id
            const { error: updateError } = await supabase.auth.updateUser({
                data: { org_id: org.id }
            });
            
            if (updateError) throw updateError;
            
            // 4. Add team members if provided
            if (formData.team.members.length > 0) {
                const teamMembers = formData.team.members.map(email => ({
                    org_id: org.id,
                    email: email,
                    role: formData.team.defaultRole,
                    invited_by: authData.user.id
                }));
                
                const { error: teamError } = await supabase
                    .from('team_members')
                    .insert(teamMembers);
                    
                if (teamError) throw teamError;
            }
            
            console.log('Form submission completed successfully');
            showToast('Organization created successfully!');
            
            // Display success message
            steps[currentStep].classList.add('hidden');
            const successStep = document.createElement('div');
            successStep.className = 'form-step active space-y-6';
            successStep.innerHTML = `
                <h2 class="text-2xl md:text-3xl font-semibold text-center mt-8">
                    Success!
                </h2>
                <p class="text-center text-gray-300">Your organization has been created successfully.</p>
                <div class="flex justify-center mt-4">
                    <a href="/public/dashboard/index.html" class="py-3 px-6 bg-gradient-to-r from-primary to-secondary rounded-xl text-white font-medium hover:opacity-90">
                        Go to Dashboard
                    </a>
                </div>
            `;
            form.appendChild(successStep);
        } catch (error) {
            console.error('Form submission error:', error);
            
            // Check if the error is due to the user already existing
            if (error.message.includes('already exists')) {
                showError(document.getElementById('email'), 'User with this email already exists.');
            } else {
                showToast('An error occurred. Please try again.', 'error');
            }
        } finally {
            setLoading(false);
        }
    });

    // Initialize all features
    function initializeAllFeatures() {
        console.log('Initializing all features');
        try {
            initializeFileUploads();
            initializeAutoSave();
            initializeOfflineSupport();
            updateStepIndicators(currentStep);

            // Real-time validation
            const inputs = form.querySelectorAll('input, select');
            inputs.forEach(input => {
                input.addEventListener('input', () => {
                    clearError(input);
                });
            });

            // Password strength indicator
            const passwordInput = document.getElementById('password');
            if (passwordInput) {
                passwordInput.addEventListener('input', checkPasswordStrengthAndUpdate);
            }

            console.log('All features initialized successfully');
        } catch (error) {
            console.error('Error initializing features:', error);
            showToast('Some features may not be available', 'warning');
        }
    }

    initializeAllFeatures();
});

// Optionally export for testing if needed
export {
    validateEmail,
    checkPasswordStrength,
    uploadFileToSupabase
};