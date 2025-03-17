
If you prefer to use SQL directly, go to the SQL Editor in Supabase and run:

```sql
-- Allow public to view avatars
CREATE POLICY "Allow public to view avatars" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'avatars');

-- Allow authenticated users to upload avatars
CREATE POLICY "Allow authenticated users to upload avatars" 
ON storage.objects 
FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'avatars');

-- Allow authenticated users to update their avatars
CREATE POLICY "Allow authenticated users to update avatars" 
ON storage.objects 
FOR UPDATE 
TO authenticated 
USING (bucket_id = 'avatars');

-- Allow authenticated users to delete their avatars
CREATE POLICY "Allow authenticated users to delete avatars" 
ON storage.objects 
FOR DELETE 
TO authenticated 
USING (bucket_id = 'avatars');
```