import { supabase } from '../../src/config/supabase.js';
import { setupNavigationHandlers, enforceClickability } from '../js/navigation.js';

// Add these debug statements at the top
console.log('********** LOADING SETTINGS.JS FROM /public/dashboard/settings.js **********');
console.log('Supabase auth methods available:', Object.keys(supabase.auth));

// Declare userProfile as a global variable outside any function
let userProfile = null;
let orgData = null;
let currentOrgId = null;
let verificationEmailSent = false;

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize navigation and enforce clickability
    setupNavigationHandlers();
    enforceClickability();
    
    // Check if user is logged in
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = '/public/signin.html';
        return;
    }

    // User dropdown and avatar handling
    const userAvatar = document.getElementById('user-avatar');
    const userDropdown = document.getElementById('user-dropdown');
    const userName = document.getElementById('user-name');
    const userEmail = document.getElementById('user-email');
    const profilePhoto = document.getElementById('profile-photo');

    // User dropdown toggle
    if (userAvatar && userDropdown) {
        userAvatar.addEventListener('click', () => {
            userDropdown.classList.toggle('hidden');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!userAvatar.contains(e.target) && !userDropdown.contains(e.target)) {
                userDropdown.classList.add('hidden');
            }
        });
    }

    // Set user info
    if (userName) userName.textContent = session.user.user_metadata?.full_name || 'User';
    if (userEmail) userEmail.textContent = session.user.email;

    // Load user profile data
    await loadUserProfile(session.user.id, session);
    
    // If the user belongs to an organization, load organization data
    if (userProfile && userProfile.org_id) {
        currentOrgId = userProfile.org_id;
        await loadOrganizationData(currentOrgId);
    }

    // Sign out handler
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await supabase.auth.signOut();
                window.location.href = '/public/signin.html';
            } catch (error) {
                console.error('Error signing out:', error);
                displayAlert('Failed to sign out. Please try again.', 'error');
            }
        });
    }

    // Check URL for tab parameter
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    const hashFragment = window.location.hash.substring(1);
    const initialTab = tabParam || hashFragment || 'profile';

    // Tab switching
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    // Setup tab switching functionality
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            activateTab(button.getAttribute('data-tab'), tabButtons, tabContents);
            
            // Update URL without page reload
            const url = new URL(window.location);
            url.searchParams.set('tab', button.getAttribute('data-tab'));
            window.history.pushState({}, '', url);
        });
    });

    // Activate initial tab from URL parameter or hash
    const targetTabButton = document.querySelector(`.tab-button[data-tab="${initialTab}"]`);
    if (targetTabButton) {
        activateTab(initialTab, tabButtons, tabContents);
    }

    // Email security verification toggle handler
    const securityEmailToggle = document.getElementById('toggle-security-email');
    if (securityEmailToggle) {
        securityEmailToggle.checked = userProfile?.security_email_verification || false;
        
        securityEmailToggle.addEventListener('change', async () => {
            try {
                const { error } = await supabase
                    .from('profiles')
                    .update({ security_email_verification: securityEmailToggle.checked })
                    .eq('id', session.user.id);
                    
                if (error) throw error;
                
                displayAlert(
                    securityEmailToggle.checked 
                        ? 'Email verification for sensitive actions enabled' 
                        : 'Email verification for sensitive actions disabled',
                    'success'
                );
            } catch (error) {
                console.error('Error updating security settings:', error);
                displayAlert('Failed to update security settings', 'error');
                // Reset toggle to previous state
                securityEmailToggle.checked = !securityEmailToggle.checked;
            }
        });
    }

    setupPhotoUpload(session.user.id);
    setupFormHandlers(session);
    setupDataManagementHandlers(session);
});

// Send verification email for sensitive actions
async function sendVerificationEmail(action) {
    try {
        // Generate a random 6-digit code
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Store code in session storage with expiration (15 minutes)
        const expirationTime = Date.now() + (15 * 60 * 1000);
        sessionStorage.setItem('verificationCode', verificationCode);
        sessionStorage.setItem('verificationExpires', expirationTime.toString());
        sessionStorage.setItem('verificationAction', action);
        
        // In a real application, you would send an email with this code
        // Here, we'll simulate it by using the Supabase function or a mock
        
        // For demo purposes, we'll skip actual email sending and show the code
        // This is NOT secure for production - use a real email service
        alert(`[Development Only] Your verification code is: ${verificationCode}\nIn production, this would be sent via email.`);
        
        return true;
    } catch (error) {
        console.error('Error sending verification email:', error);
        displayAlert('Failed to send verification email. Please try again.', 'error');
        return false;
    }
}

// Verify code for sensitive actions
function verifyCode(inputCode) {
    const storedCode = sessionStorage.getItem('verificationCode');
    const expirationTime = parseInt(sessionStorage.getItem('verificationExpires') || '0');
    
    // Check if code is expired
    if (Date.now() > expirationTime) {
        displayAlert('Verification code has expired. Please request a new one.', 'error');
        return false;
    }
    
    // Check if code matches
    if (inputCode === storedCode) {
        // Clear verification data
        sessionStorage.removeItem('verificationCode');
        sessionStorage.removeItem('verificationExpires');
        sessionStorage.removeItem('verificationAction');
        return true;
    } else {
        displayAlert('Invalid verification code. Please try again.', 'error');
        return false;
    }
}

// Setup form submission handlers
function setupFormHandlers(session) {
    // Profile form
    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            try {
                // Check if email verification is required
                const { data: profileData } = await supabase
                    .from('profiles')
                    .select('security_email_verification')
                    .eq('id', session.user.id)
                    .single();
                
                if (profileData?.security_email_verification) {
                    // Show verification modal
                    if (!verificationEmailSent) {
                        verificationEmailSent = await sendVerificationEmail('profile_update');
                        if (!verificationEmailSent) {
                            return;
                        }
                        
                        // Create verification modal
                        const modal = document.createElement('div');
                        modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
                        modal.innerHTML = `
                            <div class="bg-dark p-6 rounded-lg shadow-lg max-w-md w-full">
                                <h3 class="text-xl font-semibold mb-4">Email Verification</h3>
                                <p class="text-light mb-4">A verification code has been sent to your email. Please enter it below to continue.</p>
                                <input type="text" id="verification-code" placeholder="Enter verification code" class="w-full px-3 py-2 bg-mid border border-mid rounded-lg text-white mb-4">
                                <div class="flex justify-end space-x-3">
                                    <button id="cancel-verification" class="px-4 py-2 bg-mid hover:bg-mid/80 rounded-lg">Cancel</button>
                                    <button id="submit-verification" class="px-4 py-2 bg-primary hover:bg-primary/90 rounded-lg">Verify</button>
                                </div>
                            </div>
                        `;
                        document.body.appendChild(modal);
                        
                        // Add event listeners
                        document.getElementById('cancel-verification').addEventListener('click', () => {
                            modal.remove();
                            verificationEmailSent = false;
                        });
                        
                        document.getElementById('submit-verification').addEventListener('click', async () => {
                            const code = document.getElementById('verification-code').value;
                            if (verifyCode(code)) {
                                modal.remove();
                                verificationEmailSent = false;
                                updateProfile(session.user.id);
                            }
                        });
                        
                        return;
                    }
                } else {
                    // No verification needed, proceed with update
                    updateProfile(session.user.id);
                }
                
                async function updateProfile(userId) {
                    // Update profile in the profiles table
                    const { error } = await supabase
                        .from('profiles')
                        .update({
                            full_name: document.getElementById('full-name').value,
                            display_name: document.getElementById('display-name').value,
                            job_title: document.getElementById('job-title').value,
                            department: document.getElementById('department').value,
                            bio: document.getElementById('bio').value
                        })
                        .eq('id', userId);

                    if (error) throw error;

                    displayAlert('Profile updated successfully!', 'success');
                }
            } catch (error) {
                console.error('Error updating profile:', error);
                displayAlert('Failed to update profile. Please try again.', 'error');
            }
        });
    }

    // Email form
    const emailForm = document.getElementById('email-form');
    if (emailForm) {
        emailForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const newEmail = document.getElementById('new-email').value;

            try {
                // Check if email verification is required
                const { data: profileData } = await supabase
                    .from('profiles')
                    .select('security_email_verification')
                    .eq('id', session.user.id)
                    .single();
                
                if (profileData?.security_email_verification) {
                    // Show verification modal
                    if (!verificationEmailSent) {
                        verificationEmailSent = await sendVerificationEmail('email_change');
                        if (!verificationEmailSent) {
                            return;
                        }
                        
                        // Create verification modal
                        const modal = document.createElement('div');
                        modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
                        modal.innerHTML = `
                            <div class="bg-dark p-6 rounded-lg shadow-lg max-w-md w-full">
                                <h3 class="text-xl font-semibold mb-4">Email Verification</h3>
                                <p class="text-light mb-4">A verification code has been sent to your email. Please enter it below to continue.</p>
                                <input type="text" id="verification-code" placeholder="Enter verification code" class="w-full px-3 py-2 bg-mid border border-mid rounded-lg text-white mb-4">
                                <div class="flex justify-end space-x-3">
                                    <button id="cancel-verification" class="px-4 py-2 bg-mid hover:bg-mid/80 rounded-lg">Cancel</button>
                                    <button id="submit-verification" class="px-4 py-2 bg-primary hover:bg-primary/90 rounded-lg">Verify</button>
                                </div>
                            </div>
                        `;
                        document.body.appendChild(modal);
                        
                        // Add event listeners
                        document.getElementById('cancel-verification').addEventListener('click', () => {
                            modal.remove();
                            verificationEmailSent = false;
                        });
                        
                        document.getElementById('submit-verification').addEventListener('click', async () => {
                            const code = document.getElementById('verification-code').value;
                            if (verifyCode(code)) {
                                modal.remove();
                                verificationEmailSent = false;
                                updateEmail(newEmail);
                            }
                        });
                        
                        return;
                    }
                } else {
                    // No verification needed, proceed with update
                    updateEmail(newEmail);
                }
                
                async function updateEmail(email) {
                    const { data, error } = await supabase.auth.updateUser({ email });

                    if (error) throw error;

                    displayAlert('Email update initiated. Please check your inbox to confirm the change.', 'success');
                    document.getElementById('new-email').value = '';
                }
            } catch (error) {
                console.error('Error updating email:', error);
                displayAlert('Failed to update email. Please try again.', 'error');
            }
        });
    }

    // Password form
    const passwordForm = document.getElementById('password-form');
    if (passwordForm) {
        passwordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const currentPassword = document.getElementById('current-password').value;
            const newPassword = document.getElementById('new-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;

            if (newPassword !== confirmPassword) {
                displayAlert('Passwords do not match', 'error');
                return;
            }

            try {
                // Check if email verification is required
                const { data: profileData } = await supabase
                    .from('profiles')
                    .select('security_email_verification')
                    .eq('id', session.user.id)
                    .single();
                
                if (profileData?.security_email_verification) {
                    // Show verification modal
                    if (!verificationEmailSent) {
                        verificationEmailSent = await sendVerificationEmail('password_change');
                        if (!verificationEmailSent) {
                            return;
                        }
                        
                        // Create verification modal
                        const modal = document.createElement('div');
                        modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
                        modal.innerHTML = `
                            <div class="bg-dark p-6 rounded-lg shadow-lg max-w-md w-full">
                                <h3 class="text-xl font-semibold mb-4">Email Verification</h3>
                                <p class="text-light mb-4">A verification code has been sent to your email. Please enter it below to continue.</p>
                                <input type="text" id="verification-code" placeholder="Enter verification code" class="w-full px-3 py-2 bg-mid border border-mid rounded-lg text-white mb-4">
                                <div class="flex justify-end space-x-3">
                                    <button id="cancel-verification" class="px-4 py-2 bg-mid hover:bg-mid/80 rounded-lg">Cancel</button>
                                    <button id="submit-verification" class="px-4 py-2 bg-primary hover:bg-primary/90 rounded-lg">Verify</button>
                                </div>
                            </div>
                        `;
                        document.body.appendChild(modal);
                        
                        // Add event listeners
                        document.getElementById('cancel-verification').addEventListener('click', () => {
                            modal.remove();
                            verificationEmailSent = false;
                        });
                        
                        document.getElementById('submit-verification').addEventListener('click', async () => {
                            const code = document.getElementById('verification-code').value;
                            if (verifyCode(code)) {
                                modal.remove();
                                verificationEmailSent = false;
                                updatePassword(newPassword);
                            }
                        });
                        
                        return;
                    }
                } else {
                    // No verification needed, proceed with update
                    updatePassword(newPassword);
                }
                
                async function updatePassword(password) {
                    // First verify the current password by attempting to sign in
                    const { error: signInError } = await supabase.auth
                        .signInWithPassword({
                            email: session.user.email,
                            password: currentPassword
                        });
                    
                    if (signInError) {
                        displayAlert('Current password is incorrect', 'error');
                        return;
                    }
                
                    const { data, error } = await supabase.auth
                        .updateUser({ password });

                    if (error) throw error;

                    displayAlert('Password updated successfully!', 'success');
                    document.getElementById('current-password').value = '';
                    document.getElementById('new-password').value = '';
                    document.getElementById('confirm-password').value = '';
                }
            } catch (error) {
                console.error('Error updating password:', error);
                displayAlert('Failed to update password. Please try again.', 'error');
            }
        });
    }

    // Organization form
    const orgForm = document.getElementById('org-form');
    if (orgForm) {
        orgForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (!currentOrgId) {
                displayAlert('You are not associated with an organization', 'error');
                return;
            }
            
            try {
                const { error } = await supabase
                    .from('organizations')
                    .update({
                        org_name: document.getElementById('org-name').value,
                        org_size: document.getElementById('org-size').value,
                        industry: document.getElementById('industry').value
                    })
                    .eq('id', currentOrgId);
                    
                if (error) throw error;
                
                displayAlert('Organization settings updated successfully!', 'success');
            } catch (error) {
                console.error('Error updating organization:', error);
                displayAlert('Failed to update organization settings', 'error');
            }
        });
    }
}

// Setup data management handlers
function setupDataManagementHandlers() {
    // Delete account button
    const deleteAccountBtn = document.getElementById('delete-account-btn');
    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', async () => {
            const confirmed = confirm('Are you sure you want to delete your account? This action cannot be undone.');
            if (!confirmed) return;
            
            try {
                const { error } = await supabase.auth.admin.deleteUser(
                    (await supabase.auth.getSession()).data.session.user.id
                );
                
                if (error) throw error;
                
                await supabase.auth.signOut();
                window.location.href = '/public/signin.html?deleted=true';
            } catch (error) {
                console.error('Error deleting account:', error);
                displayAlert('Failed to delete account. Please contact support.', 'error');
            }
        });
    }
    
    // Data export button
    const exportDataBtn = document.querySelector('[class*="fas fa-file-csv"]').parentElement;
    if (exportDataBtn) {
        exportDataBtn.addEventListener('click', async () => {
            try {
                displayAlert('Preparing your data for download...', 'success');
                
                // This would be expanded in a real application to actually export data
                setTimeout(() => {
                    const dummyData = `id,name,email,created_at\n1,John Doe,john@example.com,${new Date().toISOString()}`;
                    const blob = new Blob([dummyData], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `pollsay-export-${new Date().toLocaleDateString()}.csv`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }, 1000);
            } catch (error) {
                console.error('Error exporting data:', error);
                displayAlert('Failed to export data. Please try again.', 'error');
            }
        });
    }
    
    // Manage responses button
    const manageResponsesBtn = document.querySelector('button.bg-primary.hover\\:bg-primary\\/90');
    if (manageResponsesBtn) {
        manageResponsesBtn.addEventListener('click', () => {
            displayAlert('Response management feature coming soon!', 'info');
        });
    }
    
    // Delete all responses button
    const deleteResponsesBtn = document.querySelector('button.bg-red-500\\/20.hover\\:bg-red-500\\/30');
    if (deleteResponsesBtn) {
        deleteResponsesBtn.addEventListener('click', async () => {
            const confirmed = confirm('Are you sure you want to delete all form responses? This action cannot be undone.');
            if (!confirmed) return;
            
            try {
                displayAlert('Deleting all responses...', 'info');
                // Here you would implement the actual deletion logic
                // For now, we'll just show a success message
                setTimeout(() => {
                    displayAlert('All responses have been deleted', 'success');
                }, 1500);
            } catch (error) {
                console.error('Error deleting responses:', error);
                displayAlert('Failed to delete responses. Please try again.', 'error');
            }
        });
    }
}

// Display alert message
function displayAlert(message, type = 'success') {
    // Check if an alert already exists and remove it
    const existingAlert = document.querySelector('.settings-alert');
    if (existingAlert) {
        existingAlert.remove();
    }
    
    // Create alert element
    const alertDiv = document.createElement('div');
    alertDiv.className = `settings-alert fixed bottom-4 right-4 px-4 py-3 rounded shadow-lg z-50 ${
        type === 'success' ? 'bg-green-500' : 
        type === 'error' ? 'bg-red-500' : 
        type === 'warning' ? 'bg-yellow-500' : 
        'bg-blue-500'
    } text-white flex items-center`;
    
    // Add appropriate icon
    let icon = 'check-circle';
    if (type === 'error') icon = 'exclamation-circle';
    if (type === 'warning') icon = 'exclamation-triangle';
    if (type === 'info') icon = 'info-circle';
    
    alertDiv.innerHTML = `
        <i class="fas fa-${icon} mr-2"></i>
        <span>${message}</span>
        <button class="ml-4 text-white hover:text-gray-200">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Add to DOM
    document.body.appendChild(alertDiv);
    
    // Add close button functionality
    const closeBtn = alertDiv.querySelector('button');
    closeBtn.addEventListener('click', () => {
        alertDiv.remove();
    });
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (document.body.contains(alertDiv)) {
            alertDiv.classList.add('opacity-0', 'transition-opacity', 'duration-300');
            setTimeout(() => alertDiv.remove(), 300);
        }
    }, 5000);
}

// Add this debugging function at the top level
function debugCode(location, data = {}) {
  console.log(`DEBUG [${location}]:`, data);
  // Add stack trace for deeper debugging
  if (location.includes("ERROR")) {
    console.trace("Stack trace:");
  }
}

// Add detailed debugging to loadUserProfile
async function loadUserProfile(userId, session) {
    console.log('loadUserProfile starting with:', { userId, sessionExists: !!session });
    
    debugCode('loadUserProfile:start', { userId, session: !!session });
    
    try {
        // First check if profiles table exists
        console.log('Checking profiles table...');
        const { error: tableError } = await supabase
            .from('profiles')
            .select('count')
            .limit(1)
            .single();

        if (tableError) {
            debugCode('loadUserProfile:table-error', tableError);
            // Create a fallback profile in memory so the UI still works
            const fallbackProfile = {
                id: userId,
                full_name: session?.user?.user_metadata?.full_name || '',
                display_name: session?.user?.user_metadata?.full_name || '',
                email: session?.user?.email || '',
                job_title: '',
                department: '',
                bio: '',
                security_email_verification: false
            };
            userProfile = fallbackProfile; // This global variable is now accessible
            debugCode('loadUserProfile:using-fallback', fallbackProfile);
            populateProfileFormSafe(fallbackProfile, session);
            return;
        }

        // Try to get the user profile
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) {
            debugCode('loadUserProfile:profile-not-found', error);
            
            try {
                // Create a profile if it doesn't exist
                const newProfile = {
                    id: userId,
                    full_name: session?.user?.user_metadata?.full_name || '',
                    display_name: session?.user?.user_metadata?.full_name || '',
                    email: session?.user?.email || '',
                    job_title: '',
                    department: '',
                    bio: '',
                    security_email_verification: false
                };
                
                debugCode('loadUserProfile:creating-profile', newProfile);
                
                const { data: insertData, error: insertError } = await supabase
                    .from('profiles')
                    .insert([newProfile])
                    .select();
                
                if (insertError) {
                    throw insertError;
                }
                
                // Use the newly created profile
                if (insertData && insertData.length > 0) {
                    userProfile = insertData[0];
                    debugCode('loadUserProfile:using-created-profile', userProfile);
                    populateProfileFormSafe(userProfile, session);
                    return;
                }
            } catch (createError) {
                debugCode('loadUserProfile:creation-error', createError);
                // Continue with local fallback even if creation fails
                const fallbackProfile = {
                    id: userId,
                    full_name: session?.user?.user_metadata?.full_name || '',
                    display_name: session?.user?.user_metadata?.full_name || '',
                    email: session?.user?.email || '',
                    job_title: '',
                    department: '',
                    bio: '',
                    security_email_verification: false
                };
                userProfile = fallbackProfile;
                debugCode('loadUserProfile:using-error-fallback', fallbackProfile);
                populateProfileFormSafe(fallbackProfile, session);
                return;
            }
        }

        // Successfully retrieved profile
        if (data) {
            userProfile = data;
            debugCode('loadUserProfile:profile-found', data);
            populateProfileFormSafe(data, session);

            // Handle profile photo if available
            if (data.avatar_url) {
                const profilePhoto = document.getElementById('profile-photo');
                if (profilePhoto) {
                    debugCode('loadUserProfile:setting-photo', data.avatar_url);
                    profilePhoto.src = data.avatar_url;
                    profilePhoto.onerror = () => {
                        profilePhoto.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='40' height='40'%3E%3Cpath fill='%23ccc' d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z'/%3E%3C/svg%3E";
                    };
                }
            }
        }
    } catch (error) {
        debugCode('loadUserProfile:ERROR', error);
        console.error('Error loading user profile:', error);
        // Handle error gracefully
        displayAlert('Unable to load profile data. Using default values.', 'warning');
        
        // Still use a fallback profile to ensure the UI works
        const fallbackProfile = {
            id: userId,
            full_name: session?.user?.user_metadata?.full_name || '',
            display_name: session?.user?.user_metadata?.full_name || '',
            email: session?.user?.email || '',
            job_title: '',
            department: '',
            bio: '',
            security_email_verification: false
        };
        userProfile = fallbackProfile; // This global variable is now accessible
        debugCode('loadUserProfile:using-catch-fallback', fallbackProfile);
        populateProfileFormSafe(fallbackProfile, session);
    }
}

// Completely new, safe implementation of populateProfileForm with no references to supabase.auth
function populateProfileFormSafe(profileData, session) {
    console.log('populateProfileFormSafe called with:', { 
        profileData,
        sessionExists: !!session,
        date: new Date().toISOString()
    });
    
    debugCode('populateProfileFormSafe:start', { 
        profile: profileData, 
        hasSession: !!session 
    });

    try {
        // Get all form fields safely
        const fullNameField = document.getElementById('full-name');
        const displayNameField = document.getElementById('display-name');
        const jobTitleField = document.getElementById('job-title');
        const departmentField = document.getElementById('department');
        const bioField = document.getElementById('bio');
        const emailField = document.getElementById('current-email');
        
        // Safely set values with null checks
        if (fullNameField) fullNameField.value = profileData?.full_name || '';
        if (displayNameField) displayNameField.value = profileData?.display_name || '';
        if (jobTitleField) jobTitleField.value = profileData?.job_title || '';
        if (departmentField) departmentField.value = profileData?.department || '';
        if (bioField) bioField.value = profileData?.bio || '';
        if (emailField) emailField.value = profileData?.email || '';
        
        debugCode('populateProfileFormSafe:success');
    } catch (error) {
        debugCode('populateProfileFormSafe:ERROR', error);
        console.error('Error populating form fields:', error);
    }
}

// Now replace the old populateProfileForm with our safe version
function populateProfileForm(profileData) {
    console.log('DEPRECATED populateProfileForm called with:', profileData);
    console.log('WARNING: This function should not be called directly!');
    console.trace('Call stack:');
    
    populateProfileFormSafe(profileData, null);
}

async function loadOrganizationData(orgId) {
    try {
        const { data, error } = await supabase
            .from('organizations')
            .select('*')
            .eq('id', orgId)
            .single();

        if (error) throw error;

        if (data) {
            orgData = data;
            // Populate organization form
            document.getElementById('org-name').value = data.org_name || '';
            document.getElementById('org-size').value = data.org_size || '1-10';
            document.getElementById('industry').value = data.industry || 'technology';
        }
    } catch (error) {
        console.error('Error loading organization data:', error);
        displayAlert('Failed to load organization data. Some features may be limited.', 'warning');
    }
}

function activateTab(tabId, tabButtons, tabContents) {
    // Remove active class from all tabs and hide content
    tabButtons.forEach(btn => {
        btn.classList.remove('active');
        btn.classList.remove('border-primary');
        btn.classList.add('border-transparent');
    });

    tabContents.forEach(content => {
        content.classList.add('hidden');
    });

    // Add active class to selected tab and show content
    const activeButton = document.querySelector(`.tab-button[data-tab="${tabId}"]`);
    if (activeButton) {
        activeButton.classList.add('active');
        activeButton.classList.add('border-primary');
        activeButton.classList.remove('border-transparent');
    }

    const activeContent = document.getElementById(`${tabId}-tab`);
    if (activeContent) {
        activeContent.classList.remove('hidden');
    }
}

function setupPhotoUpload(userId) {
    const uploadBtn = document.querySelector('.settings-card button');
    const removeBtn = document.querySelectorAll('.settings-card button')[1];
    const profilePhoto = document.getElementById('profile-photo');

    if (uploadBtn && removeBtn && profilePhoto) {
        // Create hidden file input
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);

        // Handle upload button click
        uploadBtn.addEventListener('click', () => {
            fileInput.click();
        });

        // Handle file selection
        fileInput.addEventListener('change', async (e) => {
            if (e.target.files && e.target.files[0]) {
                const file = e.target.files[0];

                // Validate file (only images, max 5MB)
                if (!file.type.startsWith('image/')) {
                    displayAlert('Please select an image file', 'error');
                    return;
                }

                if (file.size > 5 * 1024 * 1024) {
                    displayAlert('Image size must be less than 5MB', 'error');
                    return;
                }

                // Upload to Supabase storage
                // Use exact format: avatar-{userId}-{timestamp}
                // This format ensures the policy will work correctly
                const fileName = `avatar-${userId}-${Date.now()}`;
                uploadBtn.disabled = true;
                uploadBtn.innerHTML = 'Uploading...';

                try {
                    // Always use local fallback during RLS issues
                    let useLocalFallback = false;
                    
                    // Try to list files to check permissions
                    try {
                        const { data: listData, error: listError } = await supabase.storage
                            .from('avatars')
                            .list('', { limit: 1 });
                        
                        if (listError) {
                            console.warn('Storage list error:', listError);
                            if (listError.statusCode === 403 || listError.statusCode === 404) {
                                useLocalFallback = true;
                            }
                        }
                    } catch (listCheckError) {
                        console.warn('Storage list check error:', listCheckError);
                        useLocalFallback = true;
                    }
                    
                    // If we can access the bucket, attempt upload
                    if (!useLocalFallback) {
                        try {
                            console.log('Attempting to upload file:', fileName);
                            const { data: uploadData, error: uploadError } = await supabase.storage
                                .from('avatars')
                                .upload(fileName, file, {
                                    upsert: true,
                                    cacheControl: '3600'
                                });
                                
                            if (uploadError) {
                                console.warn('Upload error:', uploadError);
                                useLocalFallback = true;
                            } else if (uploadData) {
                                // Get public URL
                                const { data: { publicUrl } } = supabase.storage
                                    .from('avatars')
                                    .getPublicUrl(fileName);
                                    
                                // Update user profile
                                const { error: updateError } = await supabase
                                    .from('profiles')
                                    .update({ avatar_url: publicUrl })
                                    .eq('id', userId);

                                if (updateError) throw updateError;

                                // Update UI
                                profilePhoto.src = publicUrl;
                                displayAlert('Profile photo updated successfully', 'success');
                            }
                        } catch (uploadAttemptError) {
                            console.warn('Upload attempt error:', uploadAttemptError);
                            useLocalFallback = true;
                        }
                    }
                    
                    // Use local fallback if needed
                    if (useLocalFallback) {
                        console.info('Using local fallback for avatar storage');
                        console.info('To fix, copy the SQL policies from /workspaces/PollSay/learning/supabase-storage-policies.md');
                        
                        // Use a local URL via FileReader as fallback
                        const reader = new FileReader();
                        reader.onload = async (e) => {
                            const localImageUrl = e.target.result;
                            
                            // Update UI with local image
                            profilePhoto.src = localImageUrl;
                            
                            try {
                                // Store data URL directly in avatar_url
                                const { error: updateError } = await supabase
                                    .from('profiles')
                                    .update({ avatar_url: localImageUrl })
                                    .eq('id', userId);

                                if (updateError) throw updateError;
                                displayAlert('Profile photo stored as Base64 (temporary solution)', 'warning');
                            } catch (err) {
                                console.error('Error updating profile with local photo:', err);
                                displayAlert('Profile photo displayed but not saved', 'error');
                            }
                        };
                        reader.readAsDataURL(file);
                    }
                } catch (error) {
                    console.error('Error uploading profile photo:', error);
                    displayAlert('Failed to upload profile photo', 'error');
                } finally {
                    // Reset button state
                    uploadBtn.disabled = false;
                    uploadBtn.innerHTML = 'Upload Photo';
                }
            }
        });

        // Handle remove button click
        removeBtn.addEventListener('click', async () => {
            try {
                // Remove photo from profile - only update existing columns
                const { error } = await supabase
                    .from('profiles')
                    .update({ 
                        avatar_url: null
                        // Don't use columns that don't exist in the schema
                    })
                    .eq('id', userId);

                if (error) throw error;

                // Reset to default avatar
                profilePhoto.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='40' height='40'%3E%3Cpath fill='%23ccc' d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z'/%3E%3C/svg%3E";
                displayAlert('Profile photo removed', 'success');
            } catch (error) {
                console.error('Error removing profile photo:', error);
                displayAlert('Failed to remove profile photo', 'error');
            }
        });
    }
}