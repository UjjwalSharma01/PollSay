import { supabase } from '../../../src/config/supabase.js';
import { encryptionService } from '../services/encryptionService.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Check if user is logged in
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = '/public/signin.html';
    return;
  }
  
  // Elements
  const generateKeysBtn = document.getElementById('generate-keys');
  const downloadKeysBtn = document.getElementById('download-keys');
  const passphraseForm = document.getElementById('passphrase-form');
  const encryptionStatus = document.getElementById('encryption-status');
  
  // Check if organization has encryption keys
  let orgId;
  let hasKeys = false;
  
  async function initializeEncryptionStatus() {
    try {
      // Get user's organization
      const { data: orgData, error: orgError } = await supabase
        .from('team_members')
        .select('org_id')
        .eq('user_id', session.user.id)
        .single();
        
      if (orgError) throw orgError;
      orgId = orgData.org_id;
      
      // Check for existing keys
      const { data: keyData, error: keyError } = await supabase
        .from('organization_keys')
        .select('id')
        .eq('id', orgId)
        .single();
        
      if (!keyError && keyData) {
        hasKeys = true;
        encryptionStatus.innerHTML = `
          <i class="fas fa-lock text-green-500 mr-2"></i>
          <span>End-to-end encryption is enabled for your organization</span>
        `;
      } else {
        encryptionStatus.innerHTML = `
          <i class="fas fa-unlock text-yellow-500 mr-2"></i>
          <span>End-to-end encryption is not set up for your organization</span>
        `;
      }
    } catch (error) {
      console.error('Error checking encryption status:', error);
    }
  }
  
  // Generate Keys
  generateKeysBtn.addEventListener('click', async () => {
    try {
      if (hasKeys) {
        const confirmed = confirm(
          'Your organization already has encryption keys. Generating new keys will make existing encrypted data unreadable. Are you sure you want to continue?'
        );
        if (!confirmed) return;
      }
      
      // Get passphrase
      const passphrase = prompt('Enter a strong passphrase to protect your encryption keys:');
      if (!passphrase) return;
      
      // Generate new key pair
      const { publicKey, privateKey } = await encryptionService.generateOrgKeyPair();
      
      // Encrypt private key with passphrase
      const encryptedPrivateKey = await encryptionService.encryptWithPassword(
        JSON.stringify(privateKey),
        passphrase
      );
      
      // Save to database
      if (hasKeys) {
        const { error } = await supabase
          .from('organization_keys')
          .update({
            public_key: publicKey,
            encrypted_private_key: encryptedPrivateKey
          })
          .eq('id', orgId);
          
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('organization_keys')
          .insert({
            id: orgId,
            public_key: publicKey,
            encrypted_private_key: encryptedPrivateKey
          });
          
        if (error) throw error;
      }
      
      hasKeys = true;
      encryptionStatus.innerHTML = `
        <i class="fas fa-lock text-green-500 mr-2"></i>
        <span>End-to-end encryption is enabled for your organization</span>
      `;
      
      alert('Encryption keys generated successfully. Please remember your passphrase!');
    } catch (error) {
      console.error('Error generating keys:', error);
      alert('Failed to generate encryption keys. Please try again.');
    }
  });
  
  // Download Keys
  downloadKeysBtn.addEventListener('click', async () => {
    try {
      if (!hasKeys) {
        alert('No encryption keys have been generated yet.');
        return;
      }
      
      // Get passphrase for verification
      const passphrase = prompt('Enter your encryption passphrase to verify:');
      if (!passphrase) return;
      
      // Get keys from database
      const { data, error } = await supabase
        .from('organization_keys')
        .select('*')
        .eq('id', orgId)
        .single();
        
      if (error) throw error;
      
      // Verify passphrase by attempting to decrypt
      try {
        await encryptionService.decryptWithPassword(
          data.encrypted_private_key,
          passphrase
        );
      } catch (e) {
        alert('Incorrect passphrase. Backup cancelled.');
        return;
      }
      
      // Create backup file
      const backupData = {
        created_at: new Date().toISOString(),
        org_id: orgId,
        public_key: data.public_key,
        encrypted_private_key: data.encrypted_private_key,
        note: 'This file contains your organization encryption keys. Keep it secure and do not share it.'
      };
      
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `pollsay-encryption-keys-${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error backing up keys:', error);
      alert('Failed to backup encryption keys. Please try again.');
    }
  });
  
  // Update Passphrase
  passphraseForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    try {
      if (!hasKeys) {
        alert('No encryption keys have been generated yet.');
        return;
      }
      
      const currentPassphrase = document.getElementById('current-passphrase').value;
      const newPassphrase = document.getElementById('new-passphrase').value;
      const confirmPassphrase = document.getElementById('confirm-passphrase').value;
      
      if (newPassphrase !== confirmPassphrase) {
        alert('New passphrases do not match.');
        return;
      }
      
      // Get encrypted private key
      const { data, error } = await supabase
        .from('organization_keys')
        .select('encrypted_private_key')
        .eq('id', orgId)
        .single();
        
      if (error) throw error;
      
      // Decrypt with current passphrase
      let privateKeyStr;
      try {
        privateKeyStr = await encryptionService.decryptWithPassword(
          data.encrypted_private_key,
          currentPassphrase
        );
      } catch (e) {
        alert('Incorrect current passphrase.');
        return;
      }
      
      // Re-encrypt with new passphrase
      const newEncryptedPrivateKey = await encryptionService.encryptWithPassword(
        privateKeyStr,
        newPassphrase
      );
      
      // Update in database
      const { error: updateError } = await supabase
        .from('organization_keys')
        .update({
          encrypted_private_key: newEncryptedPrivateKey
        })
        .eq('id', orgId);
        
      if (updateError) throw updateError;
      
      alert('Passphrase updated successfully.');
      document.getElementById('current-passphrase').value = '';
      document.getElementById('new-passphrase').value = '';
      document.getElementById('confirm-passphrase').value = '';
      
    } catch (error) {
      console.error('Error updating passphrase:', error);
      alert('Failed to update passphrase. Please try again.');
    }
  });
  
  // Initialize
  await initializeEncryptionStatus();
});
