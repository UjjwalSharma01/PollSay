# Deployment Guide

## Environment Variables

This project uses environment variables to manage sensitive configuration such as Supabase credentials. In development with LiveServer, these values are hardcoded in `/public/js/env-config.js`.

### For Production Deployment

When deploying to production, you should replace the hardcoded values in `env-config.js` with your production environment variables.

#### Option 1: Manual Replacement

Before deploying, replace the values in `public/js/env-config.js` with your production credentials:

```js
window.ENV = {
  SUPABASE_URL: "your-production-supabase-url",
  SUPABASE_ANON_KEY: "your-production-supabase-anon-key"
}
```

#### Option 2: Build-time Replacement with Vercel

If deploying on Vercel, you can use environment variables defined in your Vercel project:

1. Add your environment variables in the Vercel dashboard
2. Create a build script that generates the `env-config.js` file 
3. Add this to your build command in `vercel.json`:

```json
{
  "buildCommand": "node utils/generate-env-config.js && your-other-build-commands"
}
```

#### Option 3: Using Build-time Environment Variables with Static Hosting

Most static hosting providers (Netlify, GitHub Pages, etc.) allow you to set environment variables during the build process:

```bash
#!/bin/bash
# Example build script
cat > ./public/js/env-config.js << EOF
window.ENV = {
  SUPABASE_URL: "${SUPABASE_URL}",
  SUPABASE_ANON_KEY: "${SUPABASE_ANON_KEY}"
}
EOF

# Continue with your build process
```

## Security Considerations

- The `SUPABASE_ANON_KEY` is safe to expose in client-side code as it has restricted permissions
- Never expose admin keys or service role keys in client-side code
- For admin functionality, use a server component with proper authentication

## Local Development

For local development with LiveServer, the default values in `env-config.js` will be used.

If you need to use different values for local development:
1. Modify `public/js/env-config.js` with your local development values
2. Ensure that these changes are not committed to version control

## Environment Reference

A reference `.env.example` file is provided to document all required environment variables.