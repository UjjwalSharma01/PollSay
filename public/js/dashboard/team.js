import { supabase } from '../../../src/config/supabase.js';

/**
 * Team management functionality for PollSay dashboard
 */

/**
 * Load team members from the database
 * @param {string} orgId - The organization ID
 * @returns {Promise<Array>} - Array of team members
 */
export async function getTeamMembers(orgId) {
    try {
        // In a real implementation, this would fetch from Supabase
        const { data, error } = await supabase
            .from('team_members')
            .select('*, profiles(*)')
            .eq('org_id', orgId);
            
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching team members:', error);
        return [];
    }
}

/**
 * Get pending invitations for an organization
 * @param {string} orgId - The organization ID
 * @returns {Promise<Array>} - Array of pending invitations
 */
export async function getPendingInvites(orgId) {
    try {
        // In a real implementation, this would fetch from Supabase
        const { data, error } = await supabase
            .from('team_invites')
            .select('*, invited_by(*)')
            .eq('org_id', orgId)
            .eq('status', 'pending');
            
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching pending invites:', error);
        return [];
    }
}

/**
 * Send a team invitation
 * @param {string} email - Recipient email address
 * @param {string} role - Role to assign (admin, member, viewer)
 * @param {string} message - Optional personal message
 * @param {string} orgId - The organization ID
 * @returns {Promise<Object>} - Result of the invitation operation
 */
export async function sendInvitation(email, role, message, orgId) {
    try {
        // In a real implementation, this would call a Supabase function
        const { data, error } = await supabase.rpc('invite_team_member', {
            p_email: email,
            p_role: role,
            p_message: message,
            p_org_id: orgId
        });
        
        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error sending invitation:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Resend a pending invitation
 * @param {string} inviteId - The invitation ID
 * @returns {Promise<Object>} - Result of the operation
 */
export async function resendInvitation(inviteId) {
    try {
        // In a real implementation, this would call a Supabase function
        const { data, error } = await supabase.rpc('resend_invitation', {
            p_invite_id: inviteId
        });
        
        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error resending invitation:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Cancel a pending invitation
 * @param {string} inviteId - The invitation ID
 * @returns {Promise<Object>} - Result of the operation
 */
export async function cancelInvitation(inviteId) {
    try {
        // In a real implementation, this would call a Supabase function
        const { data, error } = await supabase
            .from('team_invites')
            .update({ status: 'cancelled' })
            .eq('id', inviteId);
            
        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error canceling invitation:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Remove a team member
 * @param {string} memberId - The team member ID
 * @returns {Promise<Object>} - Result of the operation
 */
export async function removeTeamMember(memberId) {
    try {
        // In a real implementation, this would call a Supabase function
        const { data, error } = await supabase
            .from('team_members')
            .update({ status: 'inactive' })
            .eq('id', memberId);
            
        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error removing team member:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Update a team member's role
 * @param {string} memberId - The team member ID
 * @param {string} role - The new role
 * @returns {Promise<Object>} - Result of the operation
 */
export async function updateTeamMemberRole(memberId, role) {
    try {
        // In a real implementation, this would call a Supabase function
        const { data, error } = await supabase
            .from('team_members')
            .update({ role })
            .eq('id', memberId);
            
        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error updating team member role:', error);
        return { success: false, error: error.message };
    }
}
