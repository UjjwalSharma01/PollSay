# Supabase Storage Policy Definitions

These are the correct SQL statements to create policies for your avatars bucket. Copy and paste each statement into the SQL editor in the Supabase dashboard.

## INSERT Policy (Allow users to upload their own avatars)

```sql
CREATE POLICY "Allow users to upload their own avatars" 
ON storage.objects 
FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'avatars' AND (auth.uid()::text = substring(storage.filename::text, 8, 36)));
```

## SELECT Policy (Allow public access to avatars)

```sql
CREATE POLICY "Allow public access to avatars" 
ON storage.objects 
FOR SELECT 
TO public 
USING (bucket_id = 'avatars');
```

## UPDATE Policy (Allow users to update their own avatars)

```sql
CREATE POLICY "Allow users to update their own avatars" 
ON storage.objects 
FOR UPDATE 
TO authenticated 
USING (bucket_id = 'avatars' AND (auth.uid()::text = substring(storage.filename::text, 8, 36)));
```

## DELETE Policy (Allow users to delete their own avatars)

```sql
CREATE POLICY "Allow users to delete their own avatars" 
ON storage.objects 
FOR DELETE 
TO authenticated 
USING (bucket_id = 'avatars' AND (auth.uid()::text = substring(storage.filename::text, 8, 36)));
```

## How These Policies Work

These policies use the `substring()` function to extract the user ID from the filename. This approach works because our application uses file naming convention: `avatar-{userId}-{timestamp}`.

The `substring(storage.filename::text, 8, 36)` extracts the user ID portion after the "avatar-" prefix (which is 7 characters).
