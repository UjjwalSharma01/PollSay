import { supabase } from '../../../src/config/supabase.js';
import { encryptionService } from './encryptionService.js';

class UserProfileService {
  /**
   * Create a new user profile with encrypted sensitive data
   * @param {Object} userData - User data object
   * @param {string} userData.email - User email
   * @param {string} userData.displayName - User display name
   * @param {string} password - User password (for encryption key derivation)
   * @returns {Promise<Object>} - Created profile
   */
  async createProfile(userData, password) {
    try {
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      // Generate a pseudonym from email
      const { data: orgData } = await supabase
        .from('team_members')
        .select('org_id')
        .eq('user_id', user.id)
        .single();
      
      const orgId = orgData?.org_id;
      const pseudonym = await encryptionService.generatePseudonym(userData.email, orgId);
      
      // Encrypt sensitive data (email + pseudonym)
      const sensitiveData = {
        email: userData.email,
        pseudonym
      };
      
      // Derive encryption key from password
      const encryptionKey = await this._deriveKeyFromPassword(password);
      
      // Encrypt the sensitive data
      const encryptedData = await encryptionService.encryptUserProfile(
        sensitiveData,
        encryptionKey
      );
      
      // Store in database
      const { data, error } = await supabase
        .from('user_profiles')
        .insert({
          user_id: user.id,
          display_name: userData.displayName,
          encrypted_data: encryptedData
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating user profile:', error);
      throw error;
    }
  }
  
  /**
   * Get user profile with decrypted sensitive data
   * @param {string} password - User password for decryption
   * @returns {Promise<Object>} - User profile with decrypted data
   */
  async getProfile(password) {
    try {
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      // Get profile from database
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error) throw error;
      if (!data) throw new Error('Profile not found');
      
      // Derive encryption key from password
      const encryptionKey = await this._deriveKeyFromPassword(password);
      
      // Decrypt the sensitive data
      const decryptedData = await encryptionService.decryptUserProfile(
        data.encrypted_data,
        encryptionKey
      );
      
      // Return combined profile
      return {
        displayName: data.display_name,
        ...decryptedData,
        created_at: data.created_at
      };
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw error;
    }
  }
  
  /**
   * Helper method to derive encryption key from password
   * @param {string} password - User password
   * @returns {Promise<string>} - Derived key
   * @private
   */
  async _deriveKeyFromPassword(password) {
    // Simple key derivation - in production you might want something more sophisticated
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await window.crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
}

export const userProfileService = new UserProfileService();
