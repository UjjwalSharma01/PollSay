/**
 * Utility to help debug form access issues
 * Run this script to diagnose problems with form permissions
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Debug form access by ID
 * @param {string} formId - The form ID to test
 */
async function debugFormAccess(formId) {
  console.log(`Debugging access for form ID: ${formId}`);
  
  try {
    // Attempt to fetch the form
    const { data, error } = await supabase
      .from('forms')
      .select('id, title, created_by, is_public, org_id')
      .eq('id', formId)
      .single();
      
    if (error) {
      console.error('Error fetching form:', error);
      
      // Check if the form exists at all
      const { data: checkData, error: checkError } = await supabase
        .from('forms')
        .select('id')
        .eq('id', formId);
        
      if (checkError) {
        console.error('Error checking form existence:', checkError);
      } else if (checkData && checkData.length === 0) {
        console.log('Form does not exist in the database!');
      } else {
        console.log('Form exists but access is denied due to RLS policies.');
      }
    } else {
      console.log('Form found:', data);
      console.log('Public access:', data.is_public ? 'Yes' : 'No');
      
      // Attempt to fetch form using share_code
      const { data: formByShare } = await supabase
        .from('forms')
        .select('share_code')
        .eq('id', formId)
        .single();
        
      if (formByShare && formByShare.share_code) {
        const shareCode = formByShare.share_code;
        console.log(`Form has share code: ${shareCode}`);
        
        // Test access via share code
        const { data: shareData, error: shareError } = await supabase
          .from('forms')
          .select('id')
          .eq('share_code', shareCode)
          .single();
          
        if (shareError) {
          console.error('Error accessing form via share code:', shareError);
        } else {
          console.log('Form is accessible via share code!');
        }
      } else {
        console.log('Form does not have a share code');
      }
    }
    
    // Check RLS policies on forms table
    const { data: policies } = await supabase
      .rpc('get_table_policies', { table_name: 'forms' });
      
    console.log('Active policies for forms table:', policies);
    
  } catch (err) {
    console.error('Error during debugging:', err);
  }
}

// Run the debug function with an example form ID
// Replace with your actual form ID
debugFormAccess('your-form-id-here');

export { debugFormAccess };
