# Team Management Implementation Learnings

This document captures key lessons and best practices from implementing the team management functionality in PollSay.

## Database Design for Team Management

### Key Tables and Relationships

The team management system relies on these core tables:

1. **organizations** - Stores organization metadata
   ```sql
   CREATE TABLE organizations (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', NOW()),
     email TEXT UNIQUE NOT NULL,
     org_name TEXT NOT NULL,
     org_size TEXT NOT NULL,
     industry TEXT NOT NULL,
     status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
     metadata JSONB DEFAULT '{}'::jsonb
   );
   ```

2. **team_members** - Manages organization membership
   ```sql
   CREATE TABLE team_members (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', NOW()),
     org_id UUID NOT NULL,
     user_id UUID NOT NULL, -- References auth.uid()
     email TEXT NOT NULL,
     role TEXT NOT NULL CHECK (role IN ('admin', 'member', 'viewer')),
     status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive')),
     invite_token UUID DEFAULT uuid_generate_v4(),
     last_login TIMESTAMP WITH TIME ZONE,
     metadata JSONB DEFAULT '{}'::jsonb,
     CONSTRAINT team_members_org_id_fkey FOREIGN KEY (org_id)
       REFERENCES organizations (id) ON DELETE CASCADE
   );
   ```

### Critical Indexes

Key indexes improve performance for team-related queries:

```sql
CREATE INDEX idx_team_members_org_id ON public.team_members(org_id);
CREATE INDEX idx_team_members_email ON public.team_members(email);
CREATE INDEX idx_team_members_user_id ON public.team_members(user_id);
```

## Invitation Management Best Practices

### Invitation Workflow

1. **Creation**: Generate a unique invitation token with `invite_token: crypto.randomUUID()`
2. **Tracking**: Store invitation status as `pending` in the team_members table
3. **Verification**: During acceptance, verify the token and transition status to `active`
4. **Re-sending**: Update the token and timestamp rather than creating duplicate invitations
5. **Cancellation**: Delete the pending invitation record entirely

### Common Challenges and Solutions

1. **Duplicate Invitations**: Always check if an email already has a pending invitation
   ```javascript
   const { data: existingMember } = await supabase
     .from('team_members')
     .select('id, status')
     .eq('org_id', orgId)
     .eq('email', email)
     .single();
   ```

2. **Email Delivery**: Consider using a service like SendGrid for reliable email delivery
3. **Expiration**: Add an invitation expiry timestamp to prevent stale invitations

## Role-Based Access Control (RBAC)

### Role Hierarchy

- **Admin**: Full organization control, can manage all users
- **Member**: Can create and manage content, limited user management
- **Viewer**: Read-only access to organization content

### Access Control Implementation

1. **Frontend Permissions**:
   ```javascript
   // Hide admin-only features based on role check
   if (!isAdmin) {
     document.getElementById('invite-member-btn')?.classList.add('hidden');
     document.querySelectorAll('[data-action="edit"], [data-action="remove"]')
       .forEach(el => el.classList.add('hidden'));
   }
   ```

2. **Backend Security**:
   ```javascript
   // Check if user is admin before privileged actions
   export async function isOrgAdmin(orgId) {
     // Implementation that securely verifies role
   }
   ```

### RLS Policies for Team Management

Critical policies for team management include:

```sql
-- Allow team members to see other members in their organization
CREATE POLICY "TeamMembers Select Access for Members" ON public.team_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.org_id = public.team_members.org_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
    )
  );

-- Restrict team management actions to admins
CREATE POLICY "TeamMembers Insert Access for Admins" ON public.team_members
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.org_id = public.team_members.org_id
        AND tm.user_id = auth.uid()
        AND tm.role = 'admin'
        AND tm.status = 'active'
    )
  );
```

## Security Considerations

1. **Limiting Admin Actions**: Prevent admins from demoting themselves
   ```javascript
   // Disable self-editing buttons
   ${session?.user?.id === member.user_id ? 'disabled title="Cannot edit yourself"' : ''}
   ```

2. **Organization Isolation**: Team members can only access data from their organization
3. **Audit Trail**: Consider adding an audit log for team management actions

## User Experience Improvements

1. **Responsive Feedback**: Immediate UI updates after actions
   ```javascript
   if (result.success) {
     alert(result.message || 'Team member removed successfully');
     loadTeamMembers(); // Refresh the UI
   }
   ```

2. **Error Handling**: Graceful error handling with user-friendly messages
   ```javascript
   catch (error) {
     console.error('Error loading team members:', error);
     teamMembersTable.innerHTML = `
       <tr class="text-center">
         <td colspan="6" class="px-6 py-4 text-red-500">
           Error loading team members. Please try refreshing the page.
         </td>
       </tr>
     `;
   }
   ```

3. **Search Functionality**: Quick filtering of team members
   ```javascript
   searchMembers?.addEventListener('input', (e) => {
     const searchTerm = e.target.value.toLowerCase();
     // Filter logic
   });
   ```

## Future Improvements

1. **Email Integration**: Add actual email sending for invitations
2. **Batch Operations**: Support for inviting multiple users at once
3. **Advanced Permissions**: More granular role-based permissions
4. **Activity Logs**: Track who invited/removed members for accountability
5. **Two-Step Verification**: Require confirmation for critical actions like removing admins

## Troubleshooting Common Issues

1. **Missing Organization ID**: Always verify organization context is available
   ```javascript
   const orgId = await getCurrentOrgId();
   if (!orgId) {
     alert('You must be part of an organization to access this page.');
     window.location.href = '/public/dashboard/index.html';
     return;
   }
   ```

2. **Role Changes Not Applied**: Check for RLS policy conflicts
3. **Invitation Errors**: Verify proper constraints and unique indexes
