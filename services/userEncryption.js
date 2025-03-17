import CryptoJS from 'crypto-js';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const ENCRYPTION_SECRET = process.env.USER_DATA_ENCRYPTION_KEY; // Store in environment variables

// Encrypt sensitive user data
export function encryptUserData(data) {
  return CryptoJS.AES.encrypt(JSON.stringify(data), ENCRYPTION_SECRET).toString();
}

// Decrypt user data
export function decryptUserData(encryptedData) {
  const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_SECRET);
  return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
}

// Store encrypted user profile after email verification
export async function storeEncryptedUserProfile(userId, email, displayName, pseudonym) {
  // The sensitive data we want to encrypt
  const sensitiveData = {
    email,
    pseudonym
  };
  
  // Encrypt the sensitive data
  const encryptedData = encryptUserData(sensitiveData);
  
  // Store in database with non-sensitive data unencrypted
  const { data, error } = await supabase
    .from('user_profiles')
    .insert({
      user_id: userId,
      display_name: displayName, // Stored unencrypted for easy display
      encrypted_data: encryptedData
    });
  
  if (error) throw error;
  return data;
}

// Retrieve user's sensitive data
export async function getUserSensitiveData(userId) {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('encrypted_data')
    .eq('user_id', userId)
    .single();
    
  if (error) throw error;
  
  return decryptUserData(data.encrypted_data);
}