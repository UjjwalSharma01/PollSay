import { supabase } from '../../../src/config/supabase.js';

/**
 * Initialize dashboard common elements and user session
 * @returns {Promise<Object|null>} The user session object or null if not authenticated
 */
export async function initializeDashboard() {
    console.log('Initializing dashboard common elements');
    
    // Check if user is logged in
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = '/public/signin.html';
        return null;
    }
    
    // Set up user dropdown functionality
    setupUserDropdown();
    
    // Load and display user profile data
    await loadUserProfileDisplay(session.user.id);
    
    // Set up logout functionality
    setupLogout();
    
    return session;
}

/**
 * Set up user dropdown toggle behavior
 */
function setupUserDropdown() {
    const userAvatar = document.getElementById('user-avatar');
    const userDropdown = document.getElementById('user-dropdown');
    
    if (userAvatar && userDropdown) {
        userAvatar.addEventListener('click', function() {
            userDropdown.classList.toggle('hidden');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', function(e) {
            if (!userAvatar.contains(e.target) && !userDropdown.contains(e.target)) {
                userDropdown.classList.add('hidden');
            }
        });
    }
}

/**
 * Load user profile data and update UI elements
 * @param {string} userId - The user ID
 */
async function loadUserProfileDisplay(userId) {
    try {
        // Get user profile from database
        const { data: profileData, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
            
        if (error) {
            console.warn('Error loading profile:', error);
            return;
        }
        
        // Update UI with profile data if available
        if (profileData) {
            updateProfileDisplay(profileData);
        }
    } catch (error) {
        console.error('Error in profile display:', error);
    }
}

/**
 * Update profile display elements in the UI
 * @param {Object} profile - The user profile data
 */
function updateProfileDisplay(profile) {
    // Update user name in dropdown
    const userNameElements = document.querySelectorAll('#user-name');
    userNameElements.forEach(el => {
        el.textContent = profile.full_name || profile.display_name || 'User';
    });
    
    // Get user email from the session
    supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
            // Update user email in dropdown
            const userEmailElements = document.querySelectorAll('#user-email');
            userEmailElements.forEach(el => {
                el.textContent = user.email || '';
            });
        }
    });
    
    // Update avatar image
    const userAvatars = document.querySelectorAll('#user-avatar');
    userAvatars.forEach(avatar => {
        if (profile.avatar_url) {
            avatar.src = profile.avatar_url;
            avatar.onerror = function() {
                // Fallback to default avatar if image fails to load
                setDefaultAvatar(avatar);
            };
        } else {
            setDefaultAvatar(avatar);
        }
    });
}

/**
 * Set default avatar SVG
 * @param {HTMLImageElement} imgElement - The image element
 */
function setDefaultAvatar(imgElement) {
    imgElement.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='40' height='40'%3E%3Cpath fill='%23ccc' d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z'/%3E%3C/svg%3E";
}

/**
 * Set up logout functionality
 */
function setupLogout() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function() {
            try {
                await supabase.auth.signOut();
                window.location.href = '/public/signin.html';
            } catch (error) {
                console.error('Error signing out:', error);
            }
        });
    }
}
