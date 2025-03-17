import { supabase } from '../../../src/config/supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Check if user is logged in
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = '/public/signin.html';
    return;
  }

  // DOM Elements
  const userAvatar = document.getElementById('user-avatar');
  const userDropdown = document.getElementById('user-dropdown');
  const userName = document.getElementById('user-name');
  const userEmail = document.getElementById('user-email');
  const logoutBtn = document.getElementById('logout-btn');
  const createFormBtn = document.getElementById('create-form-btn');
  const encryptionBanner = document.getElementById('encryption-banner');
  const formsCount = document.getElementById('forms-count');
  const responsesCount = document.getElementById('responses-count');
  const encryptedFormsCount = document.getElementById('encrypted-forms-count');
  const teamCount = document.getElementById('team-count');
  const formsTableBody = document.getElementById('forms-table-body');
  const activityList = document.getElementById('activity-list');

  // Modal elements
  const copyLinkModal = document.getElementById('copy-link-modal');
  const closeModal = document.getElementById('close-modal');
  const formLinkInput = document.getElementById('form-link');
  const copyLinkBtn = document.getElementById('copy-link-btn');
  const encryptionNotice = document.getElementById('encryption-notice');

  // User dropdown toggle
  userAvatar.addEventListener('click', () => {
    userDropdown.classList.toggle('hidden');
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!userAvatar.contains(e.target) && !userDropdown.contains(e.target)) {
      userDropdown.classList.add('hidden');
    }
  });

  // Set user info
  if (session) {
    userName.textContent = session.user.user_metadata?.full_name || 'User';
    userEmail.textContent = session.user.email;
  }

  // Sign out handler
  logoutBtn.addEventListener('click', async () => {
    try {
      await supabase.auth.signOut();
      window.location.href = '/public/signin.html';
    } catch (error) {
      console.error('Error signing out:', error);
    }
  });

  // Create form button
  createFormBtn.addEventListener('click', () => {
    window.location.href = '/public/form-builder.html';
  });

  // Close modal handler
  closeModal.addEventListener('click', () => {
    copyLinkModal.classList.add('hidden');
  });

  // Copy link button handler
  copyLinkBtn.addEventListener('click', () => {
    formLinkInput.select();
    document.execCommand('copy');
    copyLinkBtn.innerHTML = '<i class="fas fa-check"></i>';
    setTimeout(() => {
      copyLinkBtn.innerHTML = '<i class="fas fa-copy"></i>';
    }, 2000);
  });

  // Check organization encryption status
  async function checkEncryptionStatus() {
    try {
      // Get user's organization
      const { data: orgData, error: orgError } = await supabase
        .from('team_members')
        .select('org_id')
        .eq('user_id', session.user.id)
        .single();
        
      if (orgError) throw orgError;

      // Check if org has encryption keys
      const { data: keyData, error: keyError } = await supabase
        .from('organization_keys')
        .select('id')
        .eq('id', orgData.org_id)
        .single();

      if (keyError || !keyData) {
        // No encryption keys found
        encryptionBanner.classList.remove('hidden');
      }
    } catch (error) {
      console.error('Error checking encryption status:', error);
    }
  }

  // Load forms
  async function loadForms() {
    try {
      // Get forms created by user
      const { data: forms, error } = await supabase
        .from('forms')
        .select(`
          id, 
          title, 
          encrypted,
          created_at,
          status,
          form_responses(count),
          encrypted_responses(count)
        `)
        .eq('created_by', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Update stats
      formsCount.textContent = forms.length;
      let totalResponses = 0;
      let totalEncryptedForms = 0;
      
      // Clear table and add forms
      formsTableBody.innerHTML = '';
      
      if (forms.length === 0) {
        formsTableBody.innerHTML = `
          <tr>
            <td colspan="5" class="px-6 py-4 text-center text-light">
              No forms created yet. <a href="/public/form-builder.html" class="text-primary hover:underline">Create your first form</a>
            </td>
          </tr>
        `;
      } else {
        forms.forEach(form => {
          // Calculate responses
          const formResponseCount = form.form_responses?.length || 0;
          const encryptedResponseCount = form.encrypted_responses?.length || 0;
          const totalFormResponses = formResponseCount + encryptedResponseCount;
          totalResponses += totalFormResponses;
          
          // Count encrypted forms
          if (form.encrypted) {
            totalEncryptedForms++;
          }
          
          const row = document.createElement('tr');
          row.className = 'hover:bg-mid/30';
          row.innerHTML = `
            <td class="px-6 py-4">
              <div class="flex items-center">
                <div class="text-sm font-medium ${form.encrypted ? 'flex items-center' : ''}">${form.title}
                  ${form.encrypted ? '<i class="fas fa-lock text-xs ml-2 text-primary"></i>' : ''}
                </div>
              </div>
            </td>
            <td class="px-6 py-4">
              <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                ${form.status === 'active' ? 'bg-green-900/20 text-green-400' : 'bg-gray-900/20 text-gray-400'}">
                ${form.status || 'active'}
              </span>
            </td>
            <td class="px-6 py-4">
              <div class="text-sm">${totalFormResponses}</div>
            </td>
            <td class="px-6 py-4">
              <div class="text-sm" title="${new Date(form.created_at).toLocaleString()}">${formatDate(form.created_at)}</div>
            </td>
            <td class="px-6 py-4">
              <div class="flex space-x-2">
                <button class="text-light hover:text-primary" data-action="share" data-id="${form.id}" data-encrypted="${form.encrypted}">
                  <i class="fas fa-share-alt"></i>
                </button>
                <button class="text-light hover:text-secondary" data-action="view" data-id="${form.id}">
                  <i class="fas fa-eye"></i>
                </button>
                <button class="text-light hover:text-red-500" data-action="delete" data-id="${form.id}">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </td>
          `;
          formsTableBody.appendChild(row);
        });
      }
      
      // Update stats
      responsesCount.textContent = totalResponses;
      encryptedFormsCount.textContent = totalEncryptedForms;
      
      // Add event handlers to buttons
      setupFormActionButtons();
      
    } catch (error) {
      console.error('Error loading forms:', error);
      formsTableBody.innerHTML = `
        <tr>
          <td colspan="5" class="px-6 py-4 text-center text-light">
            Error loading forms. Please try refreshing the page.
          </td>
        </tr>
      `;
    }
  }

  // Load team members
  async function loadTeam() {
    try {
      // Get user's organization
      const { data: orgData, error: orgError } = await supabase
        .from('team_members')
        .select('org_id')
        .eq('user_id', session.user.id)
        .single();
        
      if (orgError) throw orgError;
      
      // Get team members
      const { data: team, error: teamError } = await supabase
        .from('team_members')
        .select('*')
        .eq('org_id', orgData.org_id)
        .eq('status', 'active');
        
      if (teamError) throw teamError;
      
      // Update team count
      teamCount.textContent = team?.length || 0;
      
    } catch (error) {
      console.error('Error loading team:', error);
      teamCount.textContent = '--';
    }
  }

  // Load recent activity
  async function loadActivity() {
    try {
      // Get recent responses
      const { data: formIds, error: formsError } = await supabase
        .from('forms')
        .select('id')
        .eq('created_by', session.user.id);
        
      if (formsError) throw formsError;
      
      const formIdList = formIds.map(f => f.id);
      
      if (formIdList.length === 0) {
        activityList.innerHTML = `
          <li class="p-4 text-light">
            No activity yet. Create a form to get started.
          </li>
        `;
        return;
      }
      
      // Get regular responses
      const { data: responses, error: responsesError } = await supabase
        .from('form_responses')
        .select('*')
        .in('form_id', formIdList)
        .order('created_at', { ascending: false })
        .limit(5);
        
      // Get encrypted responses
      const { data: encryptedResponses, error: encryptedError } = await supabase
        .from('encrypted_responses')
        .select('*')
        .in('form_id', formIdList)
        .order('created_at', { ascending: false })
        .limit(5);
        
      if (responsesError && encryptedError) throw responsesError || encryptedError;
      
      // Combine and sort
      const allResponses = [
        ...(responses || []),
        ...(encryptedResponses || [])
      ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);
      
      // Clear and update activity list
      activityList.innerHTML = '';
      
      if (allResponses.length === 0) {
        activityList.innerHTML = `
          <li class="p-4 text-light">
            No recent activity.
          </li>
        `;
        return;
      }
      
      // Get form titles
      const { data: formDetails } = await supabase
        .from('forms')
        .select('id, title')
        .in('id', allResponses.map(r => r.form_id));
        
      const formMap = {};
      if (formDetails) {
        formDetails.forEach(form => {
          formMap[form.id] = form.title;
        });
      }
      
      // Create activity items
      allResponses.forEach(response => {
        const formTitle = formMap[response.form_id] || 'Unknown Form';
        const isEncrypted = 'encrypted_data' in response;
        const name = response.show_real_name && response.respondent_email ? 
                     response.respondent_email.split('@')[0] :
                     (response.respondent_pseudonym || 'Anonymous');
        
        const timeAgo = formatTimeAgo(response.created_at);
        
        activityList.innerHTML += `
          <li class="flex items-start p-4">
            <div class="rounded-full w-8 h-8 bg-primary/20 text-primary flex items-center justify-center mr-3 flex-shrink-0">
              <i class="fas fa-comment-dots"></i>
            </div>
            <div>
              <p class="text-white">New response received from <span class="font-medium">${name}</span></p>
              <p class="text-xs text-gray-400">${formTitle}</p>
              <p class="text-xs text-gray-400 mt-0.5">${timeAgo}${isEncrypted ? ' · <i class="fas fa-lock text-primary"></i> Encrypted' : ''}</p>
            </div>
          </li>
        `;
      });
      
    } catch (error) {
      console.error('Error loading activity:', error);
      activityList.innerHTML = `
        <li class="p-4 text-light">
          Error loading activity.
        </li>
      `;
    }
  }

  // Setup form action buttons
  function setupFormActionButtons() {
    // Share button
    document.querySelectorAll('[data-action="share"]').forEach(button => {
      button.addEventListener('click', () => {
        const formId = button.dataset.id;
        const isEncrypted = button.dataset.encrypted === 'true';
        
        // Generate and show form link
        const formLink = `${window.location.origin}/public/form-response.html?id=${formId}`;
        formLinkInput.value = formLink;
        encryptionNotice.classList.toggle('hidden', !isEncrypted);
        copyLinkModal.classList.remove('hidden');
      });
    });
    
    // View button
    document.querySelectorAll('[data-action="view"]').forEach(button => {
      button.addEventListener('click', () => {
        const formId = button.dataset.id;
        window.location.href = `/public/dashboard/analytics.html?formId=${formId}`;
      });
    });
    
    // Delete button
    document.querySelectorAll('[data-action="delete"]').forEach(button => {
      button.addEventListener('click', async () => {
        const formId = button.dataset.id;
        
        if (confirm('Are you sure you want to delete this form? This action cannot be undone.')) {
          try {
            await supabase.from('forms').delete().eq('id', formId);
            // Refresh forms list
            loadForms();
          } catch (error) {
            console.error('Error deleting form:', error);
            alert('Failed to delete form. Please try again.');
          }
        }
      });
    });
  }

  // Format date helper
  function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const day = 24 * 60 * 60 * 1000;
    
    if (diff < day) {
      return 'Today';
    } else if (diff < 2 * day) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  }

  // Format time ago helper
  function formatTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    
    if (diffDay > 0) {
      return diffDay === 1 ? 'Yesterday' : `${diffDay} days ago`;
    } else if (diffHour > 0) {
      return diffHour === 1 ? '1 hour ago' : `${diffHour} hours ago`;
    } else if (diffMin > 0) {
      return diffMin === 1 ? '1 minute ago' : `${diffMin} minutes ago`;
    } else {
      return 'Just now';
    }
  }

  // Initialize dashboard
  async function initializeDashboard() {
    try {
      // Check encryption status
      await checkEncryptionStatus();
      
      // Load forms
      await loadForms();
      
      // Load team info
      await loadTeam();
      
      // Load recent activity
      await loadActivity();
    } catch (error) {
      console.error('Error initializing dashboard:', error);
    }
  }

  // Start initialization
  initializeDashboard();
});
