import { supabase } from '../../../src/config/supabase.js';

// Form access validation functions
export async function validateFormAccess(formId, shareCode, userEmail) {
    try {
        console.log('Validating access for form:', formId || shareCode);
        
        // Get form data including access controls
        const { data: formData, error } = await supabase
            .from('forms')
            .select('*')
            .eq(formId ? 'id' : 'share_code', formId || shareCode)
            .single();
            
        if (error) throw error;
        if (!formData) throw new Error('Form not found');
        
        console.log('Form data loaded:', formData.id);
        
        // If form doesn't require login, access is granted
        if (!formData.require_login) {
            console.log('Form does not require login, granting access');
            return { 
                hasAccess: true, 
                formData 
            };
        }
        
        // If login is required but no email provided, deny access
        if (!userEmail) {
            console.log('Login required but no email provided');
            return { 
                hasAccess: false, 
                formData,
                reason: 'This form requires email verification. Please sign in.'
            };
        }
        
        // Check response limit if applicable
        if (formData.response_limit) {
            const { count, error: countError } = await supabase
                .from('form_responses')
                .select('id', { count: 'exact', head: true })
                .eq('form_id', formData.id)
                .eq('respondent_email', userEmail);
                
            if (countError) throw countError;
            
            if (count >= formData.response_limit) {
                console.log(`User has reached response limit (${formData.response_limit})`);
                return {
                    hasAccess: false,
                    formData,
                    reason: `You've reached the maximum number of allowed responses (${formData.response_limit}).`
                };
            }
        }
        
        // Check if all emails are allowed (default case)
        if (formData.allow_all_emails) {
            console.log('All emails are allowed, granting access');
            return { 
                hasAccess: true, 
                formData 
            };
        }
        
        // Check specific allowed emails
        if (formData.allowed_emails && formData.allowed_emails.includes(userEmail)) {
            console.log('Email is explicitly allowed');
            return { 
                hasAccess: true, 
                formData 
            };
        }
        
        // Check domain restrictions
        if (formData.allowed_domains && formData.allowed_domains.length > 0) {
            const domain = userEmail.split('@')[1];
            console.log(`Checking if domain ${domain} is in allowed list:`, formData.allowed_domains);
            
            if (formData.allowed_domains.includes(domain)) {
                console.log('Domain is allowed');
                return { 
                    hasAccess: true, 
                    formData 
                };
            }
        }
        
        // If we reach here, access is denied
        console.log('Access denied: Email does not meet criteria');
        return {
            hasAccess: false,
            formData,
            reason: 'Your email does not have permission to access this form.'
        };
    } catch (error) {
        console.error('Error validating form access:', error);
        return { 
            hasAccess: false,
            error: error.message 
        };
    }
}
