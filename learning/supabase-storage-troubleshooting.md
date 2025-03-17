# Supabase Storage Troubleshooting Guide

## Understanding the Problem

When you see a Base64 string starting with `data:image/jpeg;base64,/9j/...` in your database `avatar_url` field, it means your application is using the fallback mechanism where:

1. The image is being stored directly in your database as a text-based data URL
2. The application is not successfully uploading the file to Supabase Storage
3. The fallback mechanism is working (the image displays), but it's not the optimal solution

This happens due to Row-Level Security (RLS) policy restrictions on your storage bucket.

## Error Messages

Typical error messages you might encounter include:

## Systematic Debugging Approach

When encountering Supabase Storage issues, follow this systematic debugging workflow:

### 1. Verify Bucket Existence
```javascript
const { data, error } = await supabase.storage.listBuckets();
console.log('Available buckets:', data?.map(b => b.name));
// Check if 'avatars' is in the list
```

### 2. Check RLS Policies
Navigate to the Supabase Dashboard > Storage > Policies to verify:
- Policies exist for the bucket
- Policies cover all operations (SELECT, INSERT, UPDATE, DELETE)
- Policy definitions are syntactically correct

### 3. Examine Auth Context
```javascript
const { data: authData } = await supabase.auth.getSession();
console.log('Auth context:', {
  loggedIn: !!authData.session,
  uid: authData.session?.user.id,
  role: authData.session?.role
});
```

### 4. Test with Service Role
Service roles bypass RLS policies. For debugging only:
```javascript
const adminSupabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SERVICE_ROLE_KEY
);
const { data, error } = await adminSupabase.storage
  .from('avatars')
  .upload('test.jpg', file);
```

### 5. Check Network Requests
In DevTools:
- Monitor the specific request to `/storage/v1/object/avatars/...`
- Check request headers (Authorization should contain a JWT)
- Verify the request payload is correct

## Common Policy Errors and Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| `new row violates row-level security policy` | Missing INSERT policy | Add policy for INSERT with appropriate condition |
| `permission denied` | Missing policy for operation | Add policy specific to operation (SELECT/UPDATE/DELETE) |
| `bucket not found` | Bucket doesn't exist or typo in bucket name | Create bucket or correct the name |
| `JWT is expired` | Auth token expired | Handle token refresh or re-authenticate |

## Performance Considerations

### Optimizing Storage Operations

1. **File Size Optimization**
   - Resize images client-side before upload (saves bandwidth and storage)
   - Use compression for all image types

2. **Reducing RLS Overhead**
   - Keep policies simple to minimize query execution time
   - Use indexes on columns referenced in policies

3. **Caching Strategies**
   - Set appropriate Cache-Control headers for stored objects
   - Implement client-side caching for frequently accessed images

## Interview Preparation: Supabase Storage Questions

### Q: How does Supabase Storage security compare to AWS S3?
**Answer**: Both use policy-based security, but Supabase integrates directly with the PostgreSQL RLS system. This provides several advantages:
1. **Unified Auth**: The same JWT that authenticates database requests works for storage
2. **Expressive Policies**: Full SQL power in policy definitions
3. **Database Integration**: Policies can reference database tables
4. **Simplified Setup**: No separate IAM configuration needed

However, S3 offers more advanced features like multi-region replication and lifecycle policies.

### Q: How would you secure sensitive files beyond RLS?
**Answer**: For sensitive files, I would implement:
1. **Client-side encryption**: Encrypt files before upload using user-specific keys
2. **Limited-time URLs**: Generate short-lived signed URLs for downloads
3. **Metadata sanitization**: Strip EXIF and other metadata that might contain sensitive info
4. **Audit logging**: Track all file access attempts
5. **Watermarking**: Add visible or invisible watermarks to track source of leaks

### Q: How would you handle storage quotas and limits?
**Answer**: I'd implement a multi-layered approach:
1. **Database tracking**: Store user's current storage usage in database
2. **Pre-upload verification**: Check if upload would exceed quota
3. **Policy enforcement**: Add RLS policy that checks quota before allowing upload
4. **Soft/hard limits**: Warn at 80%, block at 100% of quota
5. **Compression tiers**: Automatically compress files when users approach limits

## Conclusion

Proper configuration of Supabase Storage RLS policies is essential for secure yet accessible file operations. By following the troubleshooting steps above and implementing appropriate policies, you can resolve most common storage issues while maintaining security.

