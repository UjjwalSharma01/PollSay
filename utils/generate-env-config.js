#!/usr/bin/env node

/**
 * This script generates a client-side env-config.js file with environment variables
 * that are safe to expose to the browser. Run this script before starting LiveServer.
 */

const fs = require('fs');
const path = require('path');

// Load environment variables from .env file
try {
  require('dotenv').config();
} catch (err) {
  console.error('Error loading .env file:', err.message);
  console.error('Make sure you have dotenv installed (npm install dotenv) and a valid .env file');
  process.exit(1);
}

// Define which environment variables are safe to expose to the client
const safeEnvVars = {
  // Only include client-safe variables here - NEVER use hardcoded credentials
  SUPABASE_URL: process.env.SUPABASE_URL || "__MISSING_SUPABASE_URL__",
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || "__MISSING_SUPABASE_ANON_KEY__"
};

// Validate that we have the necessary variables
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  console.error('Error: Missing required environment variables in .env file.');
  console.error('Make sure your .env file includes SUPABASE_URL and SUPABASE_ANON_KEY');
  process.exit(1);
}

// Create the content for the env-config.js file
const fileContent = `// This file is dynamically generated - DO NOT EDIT
// Generated on: ${new Date().toISOString()}
window.ENV = ${JSON.stringify(safeEnvVars, null, 2)};
`;

// Define the output path
const outputFilePath = path.join(__dirname, '..', 'public', 'js', 'env-config.js');

// Write the file
fs.writeFileSync(outputFilePath, fileContent);

console.log(`Environment config successfully generated at ${outputFilePath}`);