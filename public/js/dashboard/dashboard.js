import { supabase } from '../../../src/config/supabase.js';
import { initializeDashboard } from './dashboard-utils.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Initialize dashboard common elements
  const session = await initializeDashboard();
  if (!session) return;

  // DOM Elements
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

  // Create form button
  if (createFormBtn) {
    createFormBtn.addEventListener('click', () => {
      window.location.href = '/public/form-builder.html';
    });
  }

  // Close modal handler
  if (closeModal) {
    closeModal.addEventListener('click', () => {
      copyLinkModal.classList.add('hidden');
    });
  }

  // Copy link button handler
  if (copyLinkBtn) {
    copyLinkBtn.addEventListener('click', () => {
      formLinkInput.select();
      // Use modern clipboard API with fallback
      try {
        navigator.clipboard.writeText(formLinkInput.value).then(() => {
          copyLinkBtn.innerHTML = '<i class="fas fa-check"></i>';
          setTimeout(() => {
            copyLinkBtn.innerHTML = '<i class="fas fa-copy"></i>';
          }, 2000);
        });
      } catch (err) {
        // Fallback for older browsers
        document.execCommand('copy');
        copyLinkBtn.innerHTML = '<i class="fas fa-check"></i>';
        setTimeout(() => {
          copyLinkBtn.innerHTML = '<i class="fas fa-copy"></i>';
        }, 2000);
      }
    });
  }

  // Check organization encryption status - Fixed to handle no results
  async function checkEncryptionStatus() {
    try {
      if (!encryptionBanner) return;
      
      // Try to get user's organization with proper error handling
      const { data: teamMembers, error: teamError } = await supabase
        .from('team_members')
        .select('org_id')
        .eq('user_id', session.user.id);
        
      if (teamError) throw teamError;
      
      // If no team members found, show banner (user has no org)
      if (!teamMembers || teamMembers.length === 0) {
        encryptionBanner.classList.remove('hidden');
        return;
      }
      
      const orgId = teamMembers[0].org_id;
      
      // Check if org has encryption keys
      const { data: keyData, error: keyError } = await supabase
        .from('organization_keys')
        .select('id')
        .eq('id', orgId);
        
      // If no keys or error, show banner
      if (keyError || !keyData || keyData.length === 0) {
        encryptionBanner.classList.remove('hidden');
      }
    } catch (error) {
      console.error('Error checking encryption status:', error);
      // Show banner by default when there's an error
      if (encryptionBanner) encryptionBanner.classList.remove('hidden');
    }
  }

  // Load forms
  async function loadForms() {
    try {
      if (!formsTableBody) return;
      
      const { data: forms, error } = await supabase
        .from('forms')
        .select(`
          *,
          form_responses(*),
          encrypted_responses(*)
        `)
        .eq('created_by', session.user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Ensure forms is always an array
      const formsList = Array.isArray(forms) ? forms : [];
      
      // Update dashboard counters - Fix: Use formsCount instead of documentsCount
      if (formsCount) formsCount.textContent = formsList.length;
      
      // Reset counters
      let totalResponses = 0;
      let totalEncryptedForms = 0;
      
      // Clear table
      formsTableBody.innerHTML = '';
      
      // Display forms
      if (formsList.length === 0) {
        formsTableBody.innerHTML = `
          <tr>
            <td colspan="5" class="px-6 py-4 text-center text-light">
              No forms created yet. Click "New Form" to get started.
            </td>
          </tr>
        `;
      } else {
        formsList.forEach(form => {
          // Calculate responses - ensure arrays exist before checking length
          const formResponseCount = Array.isArray(form.form_responses) ? form.form_responses.length : 0;
          const encryptedResponseCount = Array.isArray(form.encrypted_responses) ? form.encrypted_responses.length : 0;
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
                <div class="text-sm font-medium ${form.encrypted ? 'flex items-center' : ''}">${form.title || 'Untitled Form'}
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
              <div class="text-sm" title="${formatDate(form.created_at, true)}">${formatDate(form.created_at)}</div>
            </td>
            <td class="px-6 py-4">
              <div class="flex space-x-2">
                <button class="text-light hover:text-primary" data-action="share" data-id="${form.id}" data-encrypted="${form.encrypted || false}">
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
        
        // Set up action buttons after adding rows to DOM
        setupFormActionButtons();
      }
      
      // Update counters
      if (responsesCount) responsesCount.textContent = totalResponses;
      if (encryptedFormsCount) encryptedFormsCount.textContent = totalEncryptedForms;
      
    } catch (err) {
      console.error('Error loading forms:', err);
      // Show a more user-friendly error in the table
      if (formsTableBody) {
        formsTableBody.innerHTML = `
          <tr>
            <td colspan="5" class="px-6 py-4 text-center text-light">
              <div class="flex flex-col items-center">
                <i class="fas fa-exclamation-circle text-red-500 text-2xl mb-2"></i>
                <p>Could not load your forms. Please try again later.</p>
                <button id="retry-forms" class="mt-2 px-4 py-2 bg-primary hover:bg-primary/90 rounded text-white text-sm">
                  Retry
                </button>
              </div>
            </td>
          </tr>
        `;
        
        document.getElementById('retry-forms')?.addEventListener('click', () => {
          loadForms();
        });
      }
    }
  }

  // Load team members - Fixed to handle no results
  async function loadTeam() {
    try {
      if (!teamCount) return;
      
      // Try to get team members directly instead of getting org_id first
      const { data: team, error: teamError } = await supabase
        .from('team_members')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('status', 'active');
        
      if (teamError) throw teamError;
      
      // Update team count safely
      const teamSize = Array.isArray(team) ? team.length : 0;
      teamCount.textContent = teamSize.toString();
      
    } catch (error) {
      console.error('Error loading team:', error);
      // Show a placeholder on error
      if (teamCount) teamCount.textContent = '--';
    }
  }

  // Load recent activity
  async function loadActivity() {
    try {
      if (!activityList) return;
      
      // Get recent responses
      const { data: formIds, error: formsError } = await supabase
        .from('forms')
        .select('id')
        .eq('created_by', session.user.id);
        
      if (formsError) throw formsError;
      
      // Ensure formIds is an array
      const formIdList = Array.isArray(formIds) ? formIds.map(f => f.id) : [];
      
      if (formIdList.length === 0) {
        activityList.innerHTML = `
          <li class="p-4 text-light">
            No activity yet. Create a form to get started.
          </li>
        `;
        return;
      }
      
      // Get regular responses - handle empty arrays
      let responses = [];
      try {
        const { data, error } = await supabase
          .from('form_responses')
          .select('*')
          .in('form_id', formIdList)
          .order('created_at', { ascending: false })
          .limit(5);
          
        if (!error && Array.isArray(data)) {
          responses = data;
        }
      } catch (err) {
        console.warn('Error fetching form responses:', err);
        // Continue execution - we'll try encrypted responses instead
      }
      
      // Get encrypted responses - handle empty arrays
      let encryptedResponses = [];
      try {
        const { data, error } = await supabase
          .from('encrypted_responses')
          .select('*')
          .in('form_id', formIdList)
          .order('created_at', { ascending: false })
          .limit(5);
          
        if (!error && Array.isArray(data)) {
          encryptedResponses = data;
        }
      } catch (err) {
        console.warn('Error fetching encrypted responses:', err);
        // Continue execution with whatever we have
      }
      
      // Combine and sort
      const allResponses = [
        ...responses,
        ...encryptedResponses
      ].sort((a, b) => new Date(b.created_at || Date.now()) - new Date(a.created_at || Date.now())).slice(0, 5);
      
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
      
      // Get form titles - with error handling
      let formMap = {};
      try {
        const { data: formDetails } = await supabase
          .from('forms')
          .select('id, title')
          .in('id', allResponses.map(r => r.form_id));
          
        if (formDetails && Array.isArray(formDetails)) {
          formDetails.forEach(form => {
            formMap[form.id] = form.title || 'Untitled Form';
          });
        }
      } catch (err) {
        console.warn('Error fetching form details:', err);
        // Continue with empty formMap
      }
      
      // Create activity items
      allResponses.forEach(response => {
        // Safely access properties with nullish coalescing
        const formId = response.form_id || '';
        const formTitle = formMap[formId] || 'Unknown Form';
        const isEncrypted = 'encrypted_data' in response;
        
        // Safely extract name
        let name = 'Anonymous';
        if (response.show_real_name && response.respondent_email) {
          const emailParts = response.respondent_email.split('@');
          name = emailParts[0] || 'Anonymous';
        } else if (response.respondent_pseudonym) {
          name = response.respondent_pseudonym;
        }
        
        // Format timestamp
        const timeAgo = formatTimeAgo(response.created_at || new Date());
        
        activityList.innerHTML += `
          <li class="flex items-start p-4">
            <div class="rounded-full w-8 h-8 bg-primary/20 text-primary flex items-center justify-center mr-3 flex-shrink-0">
              <i class="fas fa-comment-dots"></i>
            </div>
            <div>
              <p class="text-white">New response received from <span class="font-medium">${escapeHTML(name)}</span></p>
              <p class="text-xs text-gray-400">${escapeHTML(formTitle)}</p>
              <p class="text-xs text-gray-400 mt-0.5">${timeAgo}${isEncrypted ? ' · <i class="fas fa-lock text-primary"></i> Encrypted' : ''}</p>
            </div>
          </li>
        `;
      });
      
    } catch (error) {
      console.error('Error loading activity:', error);
      activityList.innerHTML = `
        <li class="p-4 text-light">
          <div class="flex flex-col items-center">
            <p>Error loading activity.</p>
            <button id="retry-activity" class="mt-2 px-4 py-2 bg-primary hover:bg-primary/90 rounded text-white text-sm">
              Retry
            </button>
          </div>
        </li>
      `;
      
      document.getElementById('retry-activity')?.addEventListener('click', () => {
        loadActivity();
      });
    }
  }

  // Setup form action buttons
  function setupFormActionButtons() {
    // Share button
    document.querySelectorAll('[data-action="share"]').forEach(button => {
      button.addEventListener('click', () => {
        const formId = button.dataset.id;
        const isEncrypted = button.dataset.encrypted === 'true';
        
        if (!copyLinkModal || !formLinkInput || !encryptionNotice) return;
        
        // Generate and show form link
        const origin = window.location.origin || 'https://pollsay.com';
        const formLink = `${origin}/public/form-response.html?id=${formId}`;
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
            const { error } = await supabase.from('forms').delete().eq('id', formId);
            
            if (error) {
              throw new Error(`Error deleting form: ${error.message}`);
            }
            
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

  // Format date helper with better error handling
  function formatDate(dateString, fullFormat = false) {
    try {
      if (!dateString) return 'Unknown date';
      
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
      
      if (fullFormat) {
        return date.toLocaleString();
      }
      
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
    } catch (err) {
      console.warn('Date formatting error:', err);
      return 'Unknown date';
    }
  }

  // Format time ago helper with error handling
  function formatTimeAgo(dateString) {
    try {
      if (!dateString) return 'Recently';
      
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Recently';
      
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
    } catch (err) {
      console.warn('Time ago formatting error:', err);
      return 'Recently';
    }
  }

  // Security helper for escaping HTML
  function escapeHTML(str) {
    if (!str || typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Initialize dashboard with better error handling
  async function initializeDashboardContent() {
    try {
      // Create promise array for parallel execution
      const promises = [
        checkEncryptionStatus().catch(err => console.error('Encryption status check failed:', err)),
        loadForms().catch(err => console.error('Loading forms failed:', err)),
        loadTeam().catch(err => console.error('Loading team failed:', err)),
        loadActivity().catch(err => console.error('Loading activity failed:', err))
      ];
      
      // Wait for all promises to settle (not just resolve)
      await Promise.allSettled(promises);
      
      console.log('Dashboard initialization complete');
    } catch (error) {
      console.error('Error initializing dashboard:', error);
    }
  }

  // Start initialization
  initializeDashboardContent();
});
