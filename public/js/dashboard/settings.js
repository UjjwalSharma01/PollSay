import { supabase } from '../../../src/config/supabase.js';
import { setupNavigationHandlers, enforceClickability } from '../navigation.js';

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

    // Set user info
    if (userName) userName.textContent = session.user.user_metadata?.full_name || 'User';
    if (userEmail) userEmail.textContent = session.user.email;

    // Load user profile data
    loadUserProfile(session.user.id);

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

    // 2FA toggle handler
    const toggle2fa = document.getElementById('toggle-2fa');
    const setup2fa = document.getElementById('2fa-setup');

    if (toggle2fa && setup2fa) {
        toggle2fa.addEventListener('change', () => {
            if (toggle2fa.checked) {
                setup2fa.classList.remove('hidden');
            } else {
                setup2fa.classList.add('hidden');
            }
        });
    }

    // Handle form submissions
    setupFormHandlers();
    
    // Setup data management handlers
    setupDataManagementHandlers();
});

// Helper function to activate a specific tab
function activateTab(tabId, tabButtons, tabContents) {
    // Remove active class from all buttons
    tabButtons.forEach(btn => {
        btn.classList.remove('active');
        btn.classList.remove('border-primary');
        btn.classList.add('border-transparent');
    });

    // Add active class to target button
    const targetButton = document.querySelector(`.tab-button[data-tab="${tabId}"]`);
    if (targetButton) {
        targetButton.classList.add('active');
        targetButton.classList.add('border-primary');
        targetButton.classList.remove('border-transparent');
    }

    // Hide all tab contents
    tabContents.forEach(content => {
        content.classList.add('hidden');
    });

    // Show target tab content
    const targetContent = document.getElementById(`${tabId}-tab`);
    if (targetContent) {
        targetContent.classList.remove('hidden');
    }
}

// Load user profile data - Fixed to use correct table
async function loadUserProfile(userId) {
    try {
        // Use profiles table instead of users
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) {
            console.warn('Profile not found, creating empty profile for:', userId);
            
            // Create a profile if it doesn't exist
            const { data: newProfile, error: insertError } = await supabase
                .from('profiles')
                .insert({
                    id: userId,
                    full_name: '',
                    display_name: '',
                    job_title: '',
                    department: '',
                    bio: ''
                })
                .select()
                .single();
            
            if (insertError) throw insertError;
            
            // Use the newly created profile
            if (newProfile) {
                populateProfileForm(newProfile);
                return;
            }
        }

        // Populate profile form
        if (data) {
            populateProfileForm(data);
        }

        // Load organization data using the org_id from the user's metadata
        if (session.user.user_metadata?.org_id) {
            await loadOrganizationData(session.user.user_metadata.org_id);
        }

    } catch (error) {
        console.error('Error loading user profile:', error);
        // Show friendly error message
        displayAlert('Unable to load profile data. Please try refreshing the page.', 'error');
    }
}

// Helper function to populate profile form
function populateProfileForm(profileData) {
    document.getElementById('full-name').value = profileData.full_name || '';
    document.getElementById('display-name').value = profileData.display_name || '';
    document.getElementById('job-title').value = profileData.job_title || '';
    document.getElementById('department').value = profileData.department || '';
    document.getElementById('bio').value = profileData.bio || '';

    // Set current email (readonly) from session
    const emailField = document.getElementById('current-email');
    if (emailField) {
        emailField.value = supabase.auth.user()?.email || '';
    }
    
    // Load data retention setting if it exists
    const retentionPeriod = document.getElementById('retention-period');
    if (retentionPeriod && profileData.data_retention_period) {
        retentionPeriod.value = profileData.data_retention_period;
    }
}

// Load organization data
async function loadOrganizationData(orgId) {
    if (!orgId) return;

    try {
        const { data, error } = await supabase
            .from('organizations')
            .select('*')
            .eq('id', orgId)
            .single();

        if (error) throw error;

        // Populate organization form
        if (data) {
            document.getElementById('org-name').value = data.name || '';
            document.getElementById('org-size').value = data.size || '1-10';
            document.getElementById('industry').value = data.industry || 'technology';
        }

    } catch (error) {
        console.error('Error loading organization data:', error);
        // Soft fail - just show warning in console
    }
}

// Display alert message
function displayAlert(message, type = 'success') {
    // Create alert element
    const alertDiv = document.createElement('div');
    alertDiv.className = `fixed bottom-4 right-4 px-4 py-3 rounded shadow-lg ${
        type === 'success' ? 'bg-green-500' : 'bg-red-500'
    } text-white`;
    alertDiv.textContent = message;
    
    // Add close button
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.className = 'ml-2 font-bold';
    closeBtn.onclick = () => document.body.removeChild(alertDiv);
    alertDiv.appendChild(closeBtn);
    
    // Add to DOM
    document.body.appendChild(alertDiv);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (document.body.contains(alertDiv)) {
            document.body.removeChild(alertDiv);
        }
    }, 5000);
}

// Setup form submission handlers
function setupFormHandlers() {
    // Profile form
    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            try {
                // Get session data for user ID
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) throw new Error('User not authenticated');
                
                // Update profile in the profiles table
                const { error } = await supabase
                    .from('profiles')
                    .upsert({
                        id: session.user.id,
                        full_name: document.getElementById('full-name').value,
                        display_name: document.getElementById('display-name').value,
                        job_title: document.getElementById('job-title').value,
                        department: document.getElementById('department').value,
                        bio: document.getElementById('bio').value
                    });

                if (error) throw error;

                displayAlert('Profile updated successfully!', 'success');

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
                const { data, error } = await supabase.auth
                    .updateUser({ email: newEmail });

                if (error) throw error;

                displayAlert('Email update initiated. Please check your inbox to confirm the change.', 'success');

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

            const newPassword = document.getElementById('new-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;

            if (newPassword !== confirmPassword) {
                displayAlert('Passwords do not match', 'error');
                return;
            }

            try {
                const { data, error } = await supabase.auth
                    .updateUser({ password: newPassword });

                if (error) throw error;

                displayAlert('Password updated successfully!', 'success');
                document.getElementById('current-password').value = '';
                document.getElementById('new-password').value = '';
                document.getElementById('confirm-password').value = '';

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

            try {
                // Get session data for user ID and org ID
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) throw new Error('User not authenticated');
                
                const orgId = session.user.user_metadata?.org_id;
                if (!orgId) throw new Error('No organization linked to user');
                
                const { error } = await supabase
                    .from('organizations')
                    .update({
                        name: document.getElementById('org-name').value,
                        size: document.getElementById('org-size').value,
                        industry: document.getElementById('industry').value
                    })
                    .eq('id', orgId);

                if (error) throw error;

                displayAlert('Organization settings updated successfully!', 'success');

            } catch (error) {
                console.error('Error updating organization:', error);
                displayAlert('Failed to update organization settings. Please try again.', 'error');
            }
        });
    }
}

// Setup additional form handlers for data management
function setupDataManagementHandlers() {
    // Data retention settings
    const saveRetentionBtn = document.querySelector('#data-tab .mt-6 button');
    if (saveRetentionBtn) {
        saveRetentionBtn.addEventListener('click', async () => {
            const retentionPeriod = document.getElementById('retention-period').value;
            
            try {
                // Get session data for user ID
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) throw new Error('User not authenticated');
                
                // Update data retention in profiles table
                const { error } = await supabase
                    .from('profiles')
                    .update({
                        data_retention_period: retentionPeriod
                    })
                    .eq('id', session.user.id);
                    
                if (error) throw error;
                
                displayAlert('Data retention preferences updated successfully!', 'success');
            } catch (error) {
                console.error('Error updating data retention settings:', error);
                displayAlert('Failed to update data retention settings. Please try again.', 'error');
            }
        });
    }
    
    // Delete form responses button
    const deleteResponsesBtn = document.querySelector('#data-tab button:nth-of-type(1)');
    if (deleteResponsesBtn) {
        deleteResponsesBtn.addEventListener('click', async () => {
            if (confirm('Are you sure you want to delete all form responses? This action cannot be undone.')) {
                try {
                    // Get user's forms
                    const { data: { session } } = await supabase.auth.getSession();
                    if (!session) throw new Error('User not authenticated');
                    
                    const { data: forms, error: formsError } = await supabase
                        .from('forms')
                        .select('id')
                        .eq('created_by', session.user.id);
                        
                    if (formsError) throw formsError;
                    
                    if (forms && forms.length > 0) {
                        const formIds = forms.map(form => form.id);
                        
                        // Delete form responses
                        const { error: deleteError } = await supabase
                            .from('form_responses')
                            .delete()
                            .in('form_id', formIds);
                            
                        if (deleteError) throw deleteError;
                        
                        // Delete encrypted responses
                        const { error: encryptedDeleteError } = await supabase
                            .from('encrypted_responses')
                            .delete()
                            .in('form_id', formIds);
                            
                        if (encryptedDeleteError) throw encryptedDeleteError;
                        
                        displayAlert('All form responses have been deleted successfully.', 'success');
                    } else {
                        displayAlert('No forms found to delete responses from.', 'success');
                    }
                } catch (error) {
                    console.error('Error deleting form responses:', error);
                    displayAlert('Failed to delete form responses. Please try again.', 'error');
                }
            }
        });
    }
    
    // Delete account button
    const deleteAccountBtn = document.querySelector('#data-tab button:nth-of-type(2)');
    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', async () => {
            if (confirm('Are you sure you want to delete your account? This will permanently remove all your data and cannot be undone.')) {
                try {
                    // Simple account deletion approach using auth API
                    const { error } = await supabase.auth.admin.deleteUser(
                        (await supabase.auth.getSession()).data.session.user.id
                    );
                    
                    if (error) throw error;
                    
                    await supabase.auth.signOut();
                    window.location.href = '/public/signin.html?deleted=true';
                } catch (error) {
                    console.error('Error deleting account:', error);
                    displayAlert('Failed to delete account. Please contact support for assistance.', 'error');
                }
            }
        });
    }
}
