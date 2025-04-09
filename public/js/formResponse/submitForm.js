import { supabase } from '../../../src/config/supabase.js';
import { validateFormAccess } from './formResponseValidation.js';

export async function submitFormResponse(formId, responseData, userEmail) {
    try {
        // Validate access before submission as a double-check
        const { hasAccess, reason } = await validateFormAccess(formId, null, userEmail);
        
        if (!hasAccess) {
            throw new Error(reason || 'Access denied to this form');
        }
        
        // Create the response object
        const formResponse = {
            form_id: formId,
            respondent_email: userEmail,
            responses: responseData,
            created_at: new Date()
        };
        
        // Submit to database
        const { data, error } = await supabase
            .from('form_responses')
            .insert([formResponse]);
            
        if (error) throw error;
        
        return { success: true, data };
    } catch (error) {
        console.error('Error submitting form response:', error);
        return { 
            success: false, 
            error: error.message 
        };
    }
}
