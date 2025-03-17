# Supabase Storage Interview Questions

This document contains common interview questions and answers about Supabase Storage implementations, particularly relevant for the PollSay application.

## Fundamentals

### Q: What is Supabase Storage and how does it compare to traditional file storage solutions?
**A:** Supabase Storage is an object storage service built on S3-compatible storage that's integrated with Supabase's authentication and permissions system. Unlike traditional file storage solutions, it offers:
- Row-level security (RLS) integration with PostgreSQL
- Built-in public/private file handling
- Direct client-side upload capabilities
- Same JWT authorization as the rest of Supabase

### Q: How do you create a new storage bucket in Supabase?
**A:** There are three ways:
1. Through the Supabase Dashboard UI: Storage → "New Bucket"
2. Using the JavaScript client:
   ```javascript
   const { data, error } = await supabase.storage.createBucket('bucket-name', { public: false })
   ```
3. Using SQL in the Database interface:
   ```sql
   INSERT INTO storage.buckets (id, name) VALUES ('bucket-name', 'bucket-name');
   ```

### Q: What is the default visibility of files in a Supabase Storage bucket?
**A:** By default, files are not publicly accessible unless:
1. The bucket is created with the `public` flag set to true
2. RLS policies are created to allow public access
3. Signed URLs are generated for access

## Security and RLS

### Q: How do Row-Level Security (RLS) policies work with Supabase Storage?
**A:** Storage RLS policies work similarly to database RLS policies. Each operation (SELECT, INSERT, UPDATE, DELETE) needs its own policy that defines who can perform that operation. The policies are PostgreSQL expressions that can reference:
- `auth.uid()`: The authenticated user's ID
- `bucket_id`: The storage bucket identifier
- `name`: The file name/path
- `storage.foldername()`: A function to extract folder components
- `storage.filename()`: A function to extract just the filename
- `storage.extension()`: A function to extract file extension

### Q: What's the relationship between file paths and RLS in Supabase Storage?
**A:** In Supabase Storage, file paths can be used as part of your security model. You can:
- Use folders as logical containers for access control
- Reference path components in RLS policies
- Extract user IDs or organization IDs from paths
- Create hierarchical access patterns based on path structure

For example, in PollSay we use the pattern `avatar-{userId}-{timestamp}` and extract the userId with `substring(storage.filename::text, 8, 36)` to verify ownership.

### Q: Explain how you would implement organization-based access to files in Supabase Storage.
**A:** To implement organization-based access:

1. Structure files with organization ID in path: `/organizations/{orgId}/files/...`
2. Create RLS policies that join to organization membership tables:
   ```sql
   CREATE POLICY "Org Members Access" 
   ON storage.objects 
   FOR SELECT 
   USING (
     storage.foldername(name)[1] = 'organizations' AND
     storage.foldername(name)[2]::uuid IN (
       SELECT org_id FROM team_members WHERE user_id = auth.uid()
     )
   );
   ```
3. Add role-based conditions for different operations:
   ```sql
   -- For admins to delete files
   CREATE POLICY "Org Admins Delete" 
   ON storage.objects 
   FOR DELETE 
   USING (
     storage.foldername(name)[1] = 'organizations' AND
     storage.foldername(name)[2]::uuid IN (
       SELECT org_id FROM team_members 
       WHERE user_id = auth.uid() AND role = 'admin'
     )
   );
   ```

## Implementation Details

### Q: How would you optimize file uploads to handle large files in Supabase Storage?
**A:** For large file uploads:

1. **Client-side optimizations:**
   - Implement chunked uploads for files over a certain size
   - Add a progress indicator using uploaded/total bytes
   - Use client-side compression before upload when appropriate

2. **Pipeline optimizations:**
   - Validate file size and type before attempting upload
   - Implement resumable uploads for user-friendly experience
   - Add pre-signed URLs for direct-to-storage uploads

3. **Post-upload processing:**
   - Use webhooks or functions to trigger processing after upload
   - Generate thumbnails or optimized versions asynchronously
   - Update metadata in database once processing is complete

### Q: What approach would you take to serve optimized images for different devices?
**A:** I would implement:

1. A multi-tier image storage strategy:
   - Original high-quality images stored in private bucket
   - Processing pipeline to generate variants (thumbnail, medium, large)
   - Public bucket for serving optimized variants

2. Dynamic URL generation:
   - Parse device information from request headers
   - Generate appropriate URLs based on screen size and connection
   - Add srcset attributes for responsive images in HTML

3. Transformation parameters:
   - Use query parameters to request specific transformations
   - Implement server functions to handle transformations on-demand
   - Cache generated variants to avoid repeated processing

### Q: How would you implement file versioning with Supabase Storage?
**A:** To implement file versioning:

1. Use timestamped filenames:
   ```javascript
   const fileName = `document-${uuid}-${Date.now()}.pdf`;
   ```

2. Maintain version metadata in a database table:
   ```sql
   CREATE TABLE file_versions (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     original_file_id UUID REFERENCES files(id),
     storage_path TEXT NOT NULL,
     version_number INTEGER NOT NULL,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
     created_by UUID REFERENCES auth.users(id)
   );
   ```

3. Implement version management logic in application code:
   - Retrieve latest version by default
   - Add UI for browsing version history
   - Provide restore functionality for older versions

## Troubleshooting and Edge Cases

### Q: What are common errors when working with Supabase Storage and how would you resolve them?
**A:** Common errors include:

1. **"new row violates row-level security policy"**
   - **Cause**: Missing or incorrect RLS policy for the operation
   - **Resolution**: Add appropriate policies for each operation type (SELECT, INSERT, UPDATE, DELETE)

2. **"Bucket not found" error**
   - **Cause**: Bucket doesn't exist or is misspelled
   - **Resolution**: Create the bucket first or check name spelling

3. **403 Unauthorized errors**
   - **Cause**: JWT issues or policy problems
   - **Resolution**: Check token expiration, verify policies, ensure user has proper permissions

4. **Syntax errors in policies**
   - **Cause**: PostgreSQL syntax issues in policy definitions
   - **Resolution**: Simplify policies, test in SQL editor, avoid comments in policy definitions

### Q: How would you handle concurrency issues with file uploads in Supabase Storage?
**A:** To handle concurrency issues:

1. Use unique, deterministic file paths:
   ```javascript
   const path = `users/${userId}/profile/${fileName}-${Date.now()}`;
   ```

2. Implement optimistic locking with metadata:
   ```javascript
   // Check if file exists with this version first
   const { data: existing } = await supabase.storage
     .from('bucket')
     .list(`users/${userId}/profile/`, {
       search: fileName,
       sortBy: { column: 'created_at', order: 'desc' }
     });
   
   // Only upload if no conflict or version differs
   ```

3. Use database transactions to coordinate metadata updates with file operations:
   ```javascript
   // Within a database transaction
   const { data: file } = await supabase.storage.from('bucket').upload(path, fileData);
   const { error } = await supabase.from('file_metadata').insert({ path, status: 'complete' });
   