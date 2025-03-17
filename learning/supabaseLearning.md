# Supabase Learning Document

This document summarizes the key learning points, challenges encountered, and solutions implemented with Supabase in the PollSay application.

## Table of Contents
1. [Row Level Security (RLS) Fundamentals](#1-row-level-security-rls-fundamentals)
2. [Function-Based Access Control](#2-function-based-access-control)
3. [Common Issues and Solutions](#3-common-issues-and-solutions)
4. [Form Access and Permissions](#4-form-access-and-permissions)
5. [Best Practices](#5-best-practices)
6. [Debugging and Troubleshooting](#6-debugging-and-troubleshooting)

## 1. Row Level Security (RLS) Fundamentals

### What is RLS?
Row Level Security (RLS) is a Postgres feature that allows you to restrict which rows a user can access in a database table. With RLS, we can control data access at the row level based on the user making the request.

### Key Components in RLS Implementation

#### Enable RLS on a Table
```sql
ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;
```

#### Policy Types
- `SELECT`: Controls which rows a user can read
- `INSERT`: Controls which rows a user can insert
- `UPDATE`: Controls which rows a user can update
- `DELETE`: Controls which rows a user can delete

#### Policy Structure
```sql
CREATE POLICY policy_name
ON table_name
FOR operation
TO role
USING (expression) -- Filter for existing rows
WITH CHECK (expression) -- Filter for new/updated rows
```

### Example from PollSay
```sql
-- Users can see forms they created
CREATE POLICY "Forms Select Own" ON public.forms
  FOR SELECT USING (auth.uid() = created_by);

-- Anyone can see public forms
CREATE POLICY "Forms Select Public" ON public.forms
  FOR SELECT USING (is_public = true);
```

## 2. Function-Based Access Control

### Why Use Functions?
We implemented custom functions to:
1. Avoid policy recursion
2. Create reusable authorization logic
3. Implement more complex access patterns

### Helper Functions for Organization Access

```sql
-- Check if user is an admin
CREATE OR REPLACE FUNCTION is_admin_of_org(p_user_id UUID, p_org_id UUID) 
RETURNS BOOLEAN AS $$
BEGIN
  -- We use SECURITY DEFINER to avoid policy recursion
  RETURN EXISTS (
    SELECT 1 
    FROM public.team_members
    WHERE user_id = p_user_id
      AND org_id = p_org_id
      AND role = 'admin'
      AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is a member
CREATE OR REPLACE FUNCTION is_member_of_org(p_user_id UUID, p_org_id UUID) 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.team_members
    WHERE user_id = p_user_id
      AND org_id = p_org_id
      AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Important Note on SECURITY DEFINER
Using `SECURITY DEFINER` makes the function execute with the privileges of the user who created it, not the user who calls it. This is crucial for avoiding recursion in policies where you might check a table that itself has policies.

## 3. Common Issues and Solutions

### Issue: Policy Recursion
**Problem**: Policies calling themselves by checking tables that also have policies.

**Solution**: Use `SECURITY DEFINER` functions to break the recursion chain.

### Issue: Ambiguous Column References
**Problem**: PostgreSQL cannot determine which table a column comes from in complex queries.

**Solution**: Always qualify column names with table names or aliases.

**Example Fix**:
```sql
-- Before (problematic)
CREATE POLICY "TeamMembers Update Policy" ON public.team_members
FOR UPDATE USING (user_id = auth.uid() OR role = 'admin');

-- After (fixed)
CREATE POLICY "TeamMembers Update Policy" ON public.team_members
FOR UPDATE USING (public.team_members.user_id = auth.uid() OR public.team_members.role = 'admin');
```

### Issue: "Failed to load the form" Error
**Problem**: Form data not accessible due to RLS policies restricting view access.

**Solutions**:
1. Create specific policies for form access:
```sql
-- Anyone can see public forms
CREATE POLICY "Forms Select Public" ON public.forms
  FOR SELECT USING (is_public = true);

-- Anyone can access a form via share_code
CREATE POLICY "Forms Select By Share Code" ON public.forms
  FOR SELECT USING (true);
```

2. Fix JavaScript code that was attempting to reassign a constant variable:
```javascript
// Before (error)
const formFields = document.getElementById('form-fields');
// Later...
formFields = formData.fields; // Error: Assignment to constant variable

// After (fixed)
const formFieldsElement = document.getElementById('form-fields');
let formFieldsData = formData.fields;
```

### Issue: RLS Policy Blocking Form Submissions 
**Problem**: Form submissions fail with error "new row violates row-level security policy for table"

**Why It Happens**: 
When Row Level Security (RLS) is enabled on a table, by default it denies ALL operations (SELECT, INSERT, UPDATE, DELETE) unless explicitly allowed by policies. If you only create a SELECT policy but no INSERT policy, then all inserts will be blocked regardless of who is performing them.

**How to Understand the Error**:
The error "new row violates row-level security policy" means that your current user doesn't have permission to add rows to the table according to the RLS policies. It doesn't mean your data is invalid - it means your permissions are insufficient.

**Solution**: Create an explicit INSERT policy that allows users to submit responses:

```sql
-- Allow public submission to form_responses
CREATE POLICY "FormResponses Insert Public" ON public.form_responses 
FOR INSERT WITH CHECK (true);
```

**Additional Steps if Still Not Working**:
1. Check that RLS is actually enabled on the table
2. Ensure the policy is correctly created
3. Sometimes you need to explicitly grant permissions to the roles:

```sql
GRANT SELECT, INSERT ON public.form_responses TO authenticated;
GRANT SELECT, INSERT ON public.form_responses TO anon;
```

4. Verify all policies for the table:

```sql
SELECT tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'form_responses';
```

**Important Note**: Each operation type (SELECT, INSERT, UPDATE, DELETE) needs its own policy. Every time you enable RLS on a table, make sure you create policies for all operations you want to allow.

## 4. Form Access and Permissions

### Multiple Access Methods
We implemented a comprehensive form access system allowing:
1. Creator access
2. Organization members access
3. Public access with `is_public` flag
4. Share code access

### Form Sharing Implementation

```sql
-- Add a public flag to forms
ALTER TABLE public.forms ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- Create policies for different access patterns
-- 1. Creator always has access
CREATE POLICY "Forms Select Own" ON public.forms
  FOR SELECT USING (auth.uid() = created_by);

-- 2. Organization members can see their org's forms
CREATE POLICY "Forms Select Org Member" ON public.forms
  FOR SELECT USING (org_id IS NOT NULL AND is_member_of_org(auth.uid(), org_id));

-- 3. Public forms visible to everyone
CREATE POLICY "Forms Select Public" ON public.forms
  FOR SELECT USING (is_public = true);

-- 4. Anyone can access via share_code (crucial for sharing!)
CREATE POLICY "Forms Select By Share Code" ON public.forms
  FOR SELECT USING (true);
```

### Access Control for Form Responses
Form responses require a careful permissions setup:

```sql
-- Only form creators can VIEW responses (restricts SELECT)
CREATE POLICY "FormResponses Select for Creators" ON form_responses
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM forms f
    WHERE f.id = form_responses.form_id
    AND f.created_by = auth.uid()
  ));

-- Anyone can SUBMIT responses (allows INSERT)
CREATE POLICY "FormResponses Insert Public" ON form_responses
  FOR INSERT WITH CHECK (true);
```

This separation of concerns enforces that:
1. Anyone can submit responses to a form - essential for public forms
2. Only the form creator can view the submitted responses - ensuring data privacy

**What Happens Without These Policies**:
- Without the INSERT policy, no one can submit form responses
- Without the proper SELECT policy, either everyone could see all responses (a privacy issue) or no one could access them (making the data useless)

**Common Gotcha**: When building a public form system, a common mistake is forgetting that anonymous users need INSERT permission. Even if your form is public, Supabase will block submissions unless you explicitly allow them with an INSERT policy.

## 5. Best Practices

### Naming Conventions
Standardize policy names for better maintenance:
- `[Table]_[Operation]_[AccessPattern]`
  - Example: `Forms_Select_Public`, `TeamMembers_Insert_AsAdmin`

### Policy Cleanup Before Creating New Ones
Always clean up old policies to avoid conflicts:
```sql
DO $$
BEGIN
  -- Drop all policies from team_members table
  DROP POLICY IF EXISTS "TeamMembers Update Access for Self or Admins" ON public.team_members;
  DROP POLICY IF EXISTS "TeamMembers Select Own and Admins" ON public.team_members;
  -- ...and so on
END;
$$;
```

### Default Form Values
Use triggers to set default values:
```sql
CREATE OR REPLACE FUNCTION set_default_org_for_form()
RETURNS TRIGGER AS $$
DECLARE
  v_auth_id uuid;
BEGIN
  v_auth_id := auth.uid();
  
  IF NEW.created_by IS NULL THEN
    NEW.created_by := v_auth_id;
  END IF;
  
  IF NEW.org_id IS NULL THEN
    SELECT tm.org_id INTO NEW.org_id
    FROM public.team_members AS tm
    WHERE tm.user_id = v_auth_id
    AND tm.status = 'active'
    ORDER BY tm.created_at ASC
    LIMIT 1;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## 6. Debugging and Troubleshooting

### Debugging Utility
We created a JavaScript utility for debugging form access issues:

```javascript
async function debugFormAccess(formId) {
  console.log(`Debugging access for form ID: ${formId}`);
  
  try {
    // Check if form exists
    const { data, error } = await supabase
      .from('forms')
      .select('id, title, created_by, is_public, org_id')
      .eq('id', formId)
      .single();
      
    // ... debugging logic
  } catch (err) {
    console.error('Error during debugging:', err);
  }
}
```

### Debugging View for User Permissions
Created a view to check user's permissions:

```sql
CREATE OR REPLACE VIEW user_permissions AS
SELECT 
  auth.uid() AS current_user_id,
  tm.org_id,
  tm.role,
  tm.status,
  o.org_name,
  is_admin_of_org(auth.uid(), tm.org_id) AS is_admin,
  is_member_of_org(auth.uid(), tm.org_id) AS is_member
FROM 
  public.team_members tm
  JOIN public.organizations o ON tm.org_id = o.id
WHERE 
  tm.user_id = auth.uid();
```

### Client-Side Error Handling
Enhanced our client code to better diagnose and handle errors:

```javascript
try {
  // Attempt database operation
} catch (err) {
  console.error('Detailed error:', err);
  
  // Additional diagnostics
  if (err.message.includes('JWTClaimsSetVerificationException')) {
    console.error('Authentication issue - token may be expired');
  } else if (err.status === 404) {
    console.error('Resource not found');
  } else if (err.status === 403) {
    console.error('Permission denied - check RLS policies');
  }
  
  // User-friendly message
  displayError('Something went wrong. Please try again.');
}
```

### Understanding RLS Policy Errors

RLS policy errors can be confusing. Here's how to interpret common error messages:

1. **"new row violates row-level security policy"**:
   - What it means: The current user doesn't have permission to insert data
   - Solution: Add an appropriate INSERT policy

2. **"permission denied for table X"**: 
   - What it means: The role lacks basic GRANT permissions
   - Solution: Use `GRANT` statements to give basic permissions

3. **"relation X does not exist"** (when you know it does):
   - What it means: RLS completely hides tables without policies
   - Solution: Create proper RLS policies for the table

RLS hides tables that the user doesn't have access to, making them appear as if they don't exist. This security-by-default approach is powerful but requires explicit permission grants.

### Debugging RLS Policies Step by Step

When facing RLS issues, follow this systematic approach:

1. Verify RLS is enabled:
```sql
SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'your_table';
```

2. Check existing policies:
```sql
SELECT * FROM pg_policies WHERE tablename = 'your_table';
```

3. Test with the service role (bypasses RLS):
```javascript
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
const { data } = await supabaseAdmin.from('your_table').select();
```

4. Add a debug policy temporarily:
```sql
CREATE POLICY "Debug_Allow_All" ON your_table
FOR ALL USING (true);
```

Remember to remove debug policies before going to production!

## Summary

Working with Supabase and PostgreSQL RLS requires careful planning of your permission model. The key lessons learned were:

1. Structure your database with permissions in mind from the start
2. Use helper functions with SECURITY DEFINER for complex access rules
3. Always qualify column references in policies to avoid ambiguity
4. Create multiple access patterns for flexibility (creator, org, public)
5. Test thoroughly with different user roles
6. Implement proper debugging tools and error handling

These practices helped us build a secure, scalable application with fine-grained access controls while maintaining a good developer experience.
