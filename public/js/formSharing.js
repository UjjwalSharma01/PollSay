/**
 * Form sharing and access control functionality
 */
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project-url.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'your-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Generate a share link for a form
 * @param {string} formId The UUID of the form
 * @returns {Promise<string>} The share URL
 */
export async function generateShareLink(formId) {
  try {
    // Get the form's share_id
    const { data: form, error } = await supabase
      .from('forms')
      .select('share_id')
      .eq('id', formId)
      .single();
      
    if (error) throw error;
    
    // If the form doesn't have a share_id yet, generate one
    if (!form.share_id) {
      const shareId = generateRandomId(12);
      
      const { error: updateError } = await supabase
        .from('forms')
        .update({ share_id: shareId })
        .eq('id', formId);
        
      if (updateError) throw updateError;
      
      form.share_id = shareId;
    }
    
    // Create the share URL
    const baseUrl = window.location.origin;
    const shareUrl = `${baseUrl}/form/${form.share_id}`;
    
    return shareUrl;
  } catch (error) {
    console.error('Error generating share link:', error);
    throw error;
  }
}

/**
 * Update form access settings
 * @param {string} formId The UUID of the form
 * @param {Object} settings Settings object
 * @param {boolean} settings.requireLogin Whether login is required
 * @param {Array<string>} settings.allowedEmails List of allowed email addresses
 * @param {number|null} settings.responseLimit Max responses per user
 * @returns {Promise<Object>} Updated form data
 */
export async function updateFormAccessSettings(formId, settings) {
  try {
    const { data, error } = await supabase
      .from('forms')
      .update({
        require_login: settings.requireLogin,
        allowed_emails: settings.allowedEmails,
        response_limit: settings.responseLimit
      })
      .eq('id', formId)
      .select()
      .single();
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating form access settings:', error);
    throw error;
  }
}

/**
 * Check if a user can respond to a form
 * @param {string} formShareId The form's share ID
 * @param {string|null} userEmail The user's email (null if not logged in)
 * @returns {Promise<{canRespond: boolean, requiresLogin: boolean, message: string}>}
 */
export async function checkFormAccessibility(formShareId, userEmail = null) {
  try {
    // First get the form
    const { data: form, error } = await supabase
      .rpc('get_form_by_share_id', { p_share_id: formShareId });
      
    if (error) throw error;
    if (!form || form.length === 0) {
      return {
        canRespond: false,
        requiresLogin: false,
        message: 'Form not found'
      };
    }
    
    const formData = form[0];
    
    // If form requires login but user is not logged in
    if (formData.require_login && !userEmail) {
      return {
        canRespond: false,
        requiresLogin: true,
        message: 'Please log in to access this form'
      };
    }
    
    // If user is logged in, check if they can respond
    if (userEmail) {
      const { data: canRespond, error: accessError } = await supabase
        .rpc('can_respond_to_form', { 
          form_id: formData.id, 
          user_email: userEmail 
        });
        
      if (accessError) throw accessError;
      
      return {
        canRespond: canRespond,
        requiresLogin: formData.require_login,
        message: canRespond ? 'Access granted' : 'You are not authorized to access this form'
      };
    }
    
    // Default case - no login required
    return {
      canRespond: true,
      requiresLogin: false,
      message: 'Access granted'
    };
  } catch (error) {
    console.error('Error checking form accessibility:', error);
    throw error;
  }
}

/**
 * Generate a random ID
 * @param {number} length Length of the ID
 * @returns {string} Random ID
 */
function generateRandomId(length = 12) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
