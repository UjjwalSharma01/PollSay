/**
 * Schema verification utility for PollSay application
 * Use this script to check database schema and identify missing columns
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY; 
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Check table schema and verify required columns
 * @param {string} tableName - The table to check
 * @param {Array<string>} requiredColumns - List of columns that should exist
 */
async function verifyTableSchema(tableName, requiredColumns) {
  console.log(`Checking schema for table: ${tableName}`);
  
  try {
    // Get schema information using system tables
    const { data, error } = await supabase.rpc('get_table_columns', {
      table_name: tableName
    });
    
    if (error) {
      console.error(`Error fetching schema for ${tableName}:`, error);
      return;
    }
    
    if (!data || data.length === 0) {
      console.error(`Table ${tableName} not found or has no columns`);
      return;
    }
    
    console.log(`\nFound ${data.length} columns in ${tableName}:`);
    const existingColumns = data.map(col => {
      console.log(`- ${col.column_name} (${col.data_type}${col.is_nullable === 'NO' ? ', NOT NULL' : ''})`);
      return col.column_name;
    });
    
    // Check for missing required columns
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
    
    if (missingColumns.length > 0) {
      console.error(`\n⚠️ Missing columns in ${tableName}:`);
      missingColumns.forEach(col => console.error(`- ${col}`));
      
      // Generate ALTER TABLE statements
      console.log('\nSQL to add missing columns:');
      missingColumns.forEach(col => {
        console.log(`ALTER TABLE public.${tableName} ADD COLUMN IF NOT EXISTS ${col} TEXT;`);
      });
    } else {
      console.log(`\n✅ Table ${tableName} has all required columns`);
    }
  } catch (err) {
    console.error('Error checking schema:', err);
  }
}

// Example usage
async function checkApplicationSchemas() {
  // Check forms table
  await verifyTableSchema('forms', [
    'id', 'title', 'description', 'fields', 'created_at', 'created_by', 
    'org_id', 'share_code', 'encrypted', 'encrypted_fields', 'encrypted_form_key',
    'is_public', 'metadata'
  ]);
  
  // Check form_responses table
  await verifyTableSchema('form_responses', [
    'id', 'form_id', 'responses', 'created_at', 'respondent_email',
    'respondent_pseudonym', 'completion_time', 'display_mode'
  ]);
  
  // Check encrypted_responses table
  await verifyTableSchema('encrypted_responses', [
    'id', 'form_id', 'encrypted_data', 'created_at', 'respondent_email',
    'respondent_pseudonym', 'show_real_name', 'completion_time'
  ]);
}

checkApplicationSchemas();

export { verifyTableSchema };
