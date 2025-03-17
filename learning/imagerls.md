ADMIN NOTE: Storage bucket "avatars" exists but RLS policies need update:
settings.js:958 Add these policies to your storage bucket in Supabase dashboard:
settings.js:959 
1. Go to Supabase dashboard -> Storage -> Buckets -> avatars -> Policies
2. Add a policy for INSERT with this SQL: (auth.uid() = .owner) OR (auth.uid() IN (SELECT user_id FROM team_members WHERE role = 'admin'))
3. Add a policy for SELECT similar to INSERT
4. Add a policy for UPDATE similar to INSERT but with: (auth.uid() = .owner) OR (auth.uid() IN (SELECT user_id FROM team_members WHERE role = 'admin'))
5. Add a policy for DELETE similar to UPDATE