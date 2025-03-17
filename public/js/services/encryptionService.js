/**
 * Encryption Service - Handles client-side encryption/decryption
 */
class EncryptionService {
  constructor() {
    this.salt = new Uint8Array(16);
    window.crypto.getRandomValues(this.salt);
  }

  /**
   * Generate a key pair for the organization
   * @returns {Promise<{publicKey: JsonWebKey, privateKey: JsonWebKey}>}
   */
  async generateOrgKeyPair() {
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["encrypt", "decrypt"]
    );

    const publicKey = await window.crypto.subtle.exportKey(
      "jwk",
      keyPair.publicKey
    );
    
    const privateKey = await window.crypto.subtle.exportKey(
      "jwk",
      keyPair.privateKey
    );

    return { publicKey, privateKey };
  }

  /**
   * Generate a form encryption key
   * @returns {Promise<{key: CryptoKey, exportedKey: JsonWebKey}>}
   */
  async generateFormKey() {
    const key = await window.crypto.subtle.generateKey(
      {
        name: "AES-GCM",
        length: 256,
      },
      true,
      ["encrypt", "decrypt"]
    );

    const exportedKey = await window.crypto.subtle.exportKey("jwk", key);
    return { key, exportedKey };
  }

  /**
   * Encrypt the form key with organization's public key
   * @param {JsonWebKey} formKey 
   * @param {JsonWebKey} publicKey 
   * @returns {Promise<string>} Base64 encoded encrypted key
   */
  async encryptFormKey(formKey, publicKey) {
    const importedPubKey = await window.crypto.subtle.importKey(
      "jwk",
      publicKey,
      {
        name: "RSA-OAEP",
        hash: "SHA-256"
      },
      false,
      ["encrypt"]
    );

    const formKeyBuffer = new TextEncoder().encode(JSON.stringify(formKey));
    const encryptedKey = await window.crypto.subtle.encrypt(
      {
        name: "RSA-OAEP"
      },
      importedPubKey,
      formKeyBuffer
    );

    return this.arrayBufferToBase64(encryptedKey);
  }

  /**
   * Decrypt the form key with organization's private key
   * @param {string} encryptedKey Base64 encoded encrypted key
   * @param {JsonWebKey} privateKey 
   * @returns {Promise<JsonWebKey>}
   */
  async decryptFormKey(encryptedKey, privateKey) {
    const importedPrivKey = await window.crypto.subtle.importKey(
      "jwk",
      privateKey,
      {
        name: "RSA-OAEP",
        hash: "SHA-256"
      },
      false,
      ["decrypt"]
    );

    const encryptedBuffer = this.base64ToArrayBuffer(encryptedKey);
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: "RSA-OAEP"
      },
      importedPrivKey,
      encryptedBuffer
    );

    return JSON.parse(new TextDecoder().decode(decryptedBuffer));
  }

  /**
   * Encrypt form data
   * @param {Object} formData 
   * @param {JsonWebKey} formKey 
   * @returns {Promise<string>} Base64 encoded encrypted data
   */
  async encryptFormData(formData, formKey) {
    const importedKey = await window.crypto.subtle.importKey(
      "jwk",
      formKey,
      {
        name: "AES-GCM",
        length: 256
      },
      false,
      ["encrypt"]
    );

    // Generate IV
    const iv = new Uint8Array(12);
    window.crypto.getRandomValues(iv);

    const encodedData = new TextEncoder().encode(JSON.stringify(formData));
    const encryptedData = await window.crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv
      },
      importedKey,
      encodedData
    );

    // Combine IV and encrypted data
    const result = {
      iv: this.arrayBufferToBase64(iv),
      data: this.arrayBufferToBase64(encryptedData)
    };

    return JSON.stringify(result);
  }

  /**
   * Decrypt form data
   * @param {string} encryptedData JSON string with iv and data properties
   * @param {JsonWebKey} formKey 
   * @returns {Promise<Object>} Decrypted form data
   */
  async decryptFormData(encryptedData, formKey) {
    const { iv, data } = JSON.parse(encryptedData);

    const importedKey = await window.crypto.subtle.importKey(
      "jwk",
      formKey,
      {
        name: "AES-GCM",
        length: 256
      },
      false,
      ["decrypt"]
    );

    const ivBuffer = this.base64ToArrayBuffer(iv);
    const dataBuffer = this.base64ToArrayBuffer(data);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: ivBuffer
      },
      importedKey,
      dataBuffer
    );

    return JSON.parse(new TextDecoder().decode(decryptedBuffer));
  }

  /**
   * Generate a pseudonym from user email
   * @param {string} email 
   * @param {string} orgId 
   * @returns {Promise<string>} Pseudonymous identifier
   */
  async generatePseudonym(email, orgId) {
    const inputBuffer = new TextEncoder().encode(`${email}:${orgId}`);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', inputBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Create readable pseudonym using first 8 chars with adjective-noun format
    const adjectives = ['Happy', 'Quick', 'Calm', 'Bright', 'Clever', 'Kind'];
    const nouns = ['Eagle', 'Tiger', 'Panda', 'Dolphin', 'Wolf', 'Falcon'];
    
    const adjIndex = parseInt(hashHex.substring(0, 2), 16) % adjectives.length;
    const nounIndex = parseInt(hashHex.substring(2, 4), 16) % nouns.length;
    
    return `${adjectives[adjIndex]}${nouns[nounIndex]}#${hashHex.substring(0, 6)}`;
  }

  /**
   * Encrypt data with a password
   * @param {string} data 
   * @param {string} password 
   * @returns {Promise<string>} Encrypted data as string
   */
  async encryptWithPassword(data, password) {
    // Derive key from password
    const encodedPassword = new TextEncoder().encode(password);
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      encodedPassword,
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );
    
    const key = await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );
    
    // Encrypt the data
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encodedData = new TextEncoder().encode(data);
    
    const encryptedData = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv
      },
      key,
      encodedData
    );
    
    // Combine salt, iv and encrypted data into a single object and encode
    const result = {
      salt: this.arrayBufferToBase64(salt),
      iv: this.arrayBufferToBase64(iv),
      data: this.arrayBufferToBase64(encryptedData)
    };
    
    return JSON.stringify(result);
  }

  /**
   * Decrypt data with a password
   * @param {string} encryptedDataStr 
   * @param {string} password 
   * @returns {Promise<string>} Decrypted data
   */
  async decryptWithPassword(encryptedDataStr, password) {
    const { salt, iv, data } = JSON.parse(encryptedDataStr);
    
    const encodedPassword = new TextEncoder().encode(password);
    const saltBuffer = this.base64ToArrayBuffer(salt);
    
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      encodedPassword,
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );
    
    const key = await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: saltBuffer,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );
    
    const ivBuffer = this.base64ToArrayBuffer(iv);
    const dataBuffer = this.base64ToArrayBuffer(data);
    
    const decryptedData = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: ivBuffer
      },
      key,
      dataBuffer
    );
    
    return new TextDecoder().decode(decryptedData);
  }

  /**
   * Simple encryption for user profile data (email, username)
   * @param {Object} userData - User data to encrypt (email, username, etc)
   * @param {string} encryptionKey - Key derived from user's password
   * @returns {Promise<string>} - Encrypted data
   */
  async encryptUserProfile(userData, encryptionKey) {
    // Convert encryption key to a suitable format
    const encoder = new TextEncoder();
    const keyData = encoder.encode(encryptionKey);
    
    // Create a key using PBKDF2
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );
    
    const key = await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );
    
    // Encrypt the data
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encodedData = encoder.encode(JSON.stringify(userData));
    
    const encryptedData = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv
      },
      key,
      encodedData
    );
    
    // Return the result with salt and IV
    return JSON.stringify({
      salt: this.arrayBufferToBase64(salt),
      iv: this.arrayBufferToBase64(iv),
      data: this.arrayBufferToBase64(encryptedData)
    });
  }
  
  /**
   * Decrypt user profile data
   * @param {string} encryptedStr - Encrypted data string
   * @param {string} encryptionKey - Key derived from user's password
   * @returns {Promise<Object>} - Decrypted user data
   */
  async decryptUserProfile(encryptedStr, encryptionKey) {
    const { salt, iv, data } = JSON.parse(encryptedStr);
    
    const encoder = new TextEncoder();
    const keyData = encoder.encode(encryptionKey);
    
    // Re-derive the key using the stored salt
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );
    
    const key = await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: this.base64ToArrayBuffer(salt),
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );
    
    // Decrypt the data
    const decryptedData = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: this.base64ToArrayBuffer(iv)
      },
      key,
      this.base64ToArrayBuffer(data)
    );
    
    // Parse and return the decrypted data
    return JSON.parse(new TextDecoder().decode(decryptedData));
  }

  // Utility methods
  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  base64ToArrayBuffer(base64) {
    const binaryString = window.atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

export const encryptionService = new EncryptionService();
