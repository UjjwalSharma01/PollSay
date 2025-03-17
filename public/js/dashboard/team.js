import { supabase } from '../../../src/config/supabase.js';

/**
 * Team management functionality for PollSay dashboard
 */

/**
 * Get the current user's organization ID
 * @returns {Promise<string|null>} - Organization ID or null if not found
 */
export async function getCurrentOrgId() {
    try {
        // First get the current user's id
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;
        
        // Then find the organizations they belong to
        const { data, error } = await supabase
            .from('team_members')
            .select('org_id')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .limit(1)
            .single();
        
        if (error) throw error;
        return data?.org_id || null;
    } catch (error) {
        console.error('Error getting current organization:', error);
        return null;
    }
}

/**
 * Load organization details
 * @param {string} orgId - Organization ID
 * @returns {Promise<Object|null>} - Organization data
 */
export async function getOrganizationDetails(orgId) {
    try {
        const { data, error } = await supabase
            .from('organizations')
            .select('*')
            .eq('id', orgId)
            .single();
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching organization details:', error);
        return null;
    }
}

/**
 * Load team members from the database
 * @param {string} orgId - The organization ID
 * @returns {Promise<Array>} - Array of team members
 */
export async function getTeamMembers(orgId) {
    try {
        if (!orgId) return [];

        const { data, error } = await supabase
            .from('team_members')
            .select(`
                id, 
                email, 
                role, 
                status, 
                created_at, 
                last_login,
                user_id
            `)
            .eq('org_id', orgId)
            .order('role', { ascending: false }) // Admins first
            .order('created_at', { ascending: true });
            
        if (error) throw error;
        
        // For active users with user_id, fetch their profile information
        const enhancedMembers = await Promise.all((data || []).map(async (member) => {
            if (member.user_id && member.status === 'active') {
                try {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('full_name, avatar_url')
                        .eq('id', member.user_id)
                        .single();
                    
                    return {
                        ...member,
                        full_name: profile?.full_name || member.email.split('@')[0],
                        avatar_url: profile?.avatar_url
                    };
                } catch (profileError) {
                    console.warn('Could not fetch profile for user:', profileError);
                }
            }
            
            // Default values for users without profiles or pending invites
            return {
                ...member,
                full_name: member.email.split('@')[0],
                avatar_url: null
            };
        }));
        
        return enhancedMembers;
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
        if (!orgId) return [];
        
        const { data, error } = await supabase
            .from('team_members')
            .select('id, email, role, created_at, invite_token')
            .eq('org_id', orgId)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });
            
        if (error) throw error;

        // Get the current user to determine who sent the invitations
        const { data: { user } } = await supabase.auth.getUser();
        
        // Enhance the pending invites with the inviter's name
        return (data || []).map(invite => ({
            ...invite,
            invited_by: user?.email || 'A team admin'
        }));
    } catch (error) {
        console.error('Error fetching pending invites:', error);
        return [];
    }
}

/**
 * Send a team invitation
 * @param {string} email - Recipient email address
 * @param {string} role - Role to assign (admin, member, viewer)
 * @param {string} orgId - The organization ID
 * @returns {Promise<Object>} - Result of the invitation operation
 */
export async function sendInvitation(email, role, orgId) {
    try {
        if (!orgId) {
            throw new Error("Organization ID is required");
        }

        // Get the current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            throw new Error("You must be logged in to invite team members");
        }
        
        // Check if the user already exists in the team
        const { data: existingMember } = await supabase
            .from('team_members')
            .select('id, status')
            .eq('org_id', orgId)
            .eq('email', email)
            .single();
        
        if (existingMember) {
            if (existingMember.status === 'active') {
                return { 
                    success: false, 
                    error: "This email is already a member of your team" 
                };
            } else if (existingMember.status === 'pending') {
                return { 
                    success: false, 
                    error: "This email already has a pending invitation" 
                };
            }
            
            // If the member is inactive, update their status
            const { error: updateError } = await supabase
                .from('team_members')
                .update({ 
                    status: 'pending',
                    role: role,
                    invite_token: crypto.randomUUID() 
                })
                .eq('id', existingMember.id);
                
            if (updateError) throw updateError;
            
            return { 
                success: true, 
                message: "Invitation resent successfully" 
            };
        }
        
        // Create a new team member with pending status
        const { error: insertError } = await supabase
            .from('team_members')
            .insert({
                org_id: orgId,
                email: email,
                role: role,
                status: 'pending',
                invite_token: crypto.randomUUID()
            });
            
        if (insertError) throw insertError;
        
        // In a real implementation, send an email to the invitee
        // For now, we're just returning success
        return { 
            success: true,
            message: `Invitation sent to ${email}`
        };
    } catch (error) {
        console.error('Error sending invitation:', error);
        return { 
            success: false, 
            error: error.message || "Failed to send invitation" 
        };
    }
}

/**
 * Resend a pending invitation
 * @param {string} inviteId - The invitation ID
 * @returns {Promise<Object>} - Result of the operation
 */
export async function resendInvitation(inviteId) {
    try {
        // Generate a new invite token
        const { error } = await supabase
            .from('team_members')
            .update({ 
                invite_token: crypto.randomUUID(),
                created_at: new Date().toISOString()
            })
            .eq('id', inviteId)
            .eq('status', 'pending');
            
        if (error) throw error;

        // In a real implementation, send an email with the new token
        return { success: true, message: "Invitation resent successfully" };
    } catch (error) {
        console.error('Error resending invitation:', error);
        return { success: false, error: error.message || "Failed to resend invitation" };
    }
}

/**
 * Cancel a pending invitation
 * @param {string} inviteId - The invitation ID
 * @returns {Promise<Object>} - Result of the operation
 */
export async function cancelInvitation(inviteId) {
    try {
        // Delete the team member record entirely
        const { error } = await supabase
            .from('team_members')
            .delete()
            .eq('id', inviteId)
            .eq('status', 'pending');
            
        if (error) throw error;
        return { success: true, message: "Invitation canceled successfully" };
    } catch (error) {
        console.error('Error canceling invitation:', error);
        return { success: false, error: error.message || "Failed to cancel invitation" };
    }
}

/**
 * Remove a team member
 * @param {string} memberId - The team member ID
 * @returns {Promise<Object>} - Result of the operation
 */
export async function removeTeamMember(memberId) {
    try {
        // Update status to inactive rather than deleting
        const { error } = await supabase
            .from('team_members')
            .update({ status: 'inactive' })
            .eq('id', memberId)
            .eq('status', 'active');
            
        if (error) throw error;
        return { success: true, message: "Team member removed successfully" };
    } catch (error) {
        console.error('Error removing team member:', error);
        return { success: false, error: error.message || "Failed to remove team member" };
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
        const { error } = await supabase
            .from('team_members')
            .update({ role: role })
            .eq('id', memberId)
            .eq('status', 'active');
            
        if (error) throw error;
        return { success: true, message: `Role updated to ${role} successfully` };
    } catch (error) {
        console.error('Error updating team member role:', error);
        return { success: false, error: error.message || "Failed to update role" };
    }
}

/**
 * Check if the current user is an admin of the organization
 * @param {string} orgId - The organization ID
 * @returns {Promise<boolean>} - True if the user is an admin
 */
export async function isOrgAdmin(orgId) {
    try {
        if (!orgId) return false;

        // Get the current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;
        
        // Check if the user is an admin
        const { data, error } = await supabase
            .from('team_members')
            .select('role')
            .eq('org_id', orgId)
            .eq('user_id', user.id)
            .eq('status', 'active')
            .single();
            
        if (error) throw error;
        return data?.role === 'admin';
    } catch (error) {
        console.error('Error checking admin status:', error);
        return false;
    }
}
