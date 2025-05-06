# Environment Variable Setup

This document explains how to set up environment variables for PollSay in both development and production environments.

## Local Development with LiveServer

When developing locally with LiveServer, follow these steps:

1. Copy `.env.example` to a new file named `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit the `.env` file and replace the placeholders with your actual Supabase credentials.

3. Run the environment config generator script:
   ```bash
   node utils/generate-env-config.js
   ```

4. Start LiveServer as usual.

The script will generate the necessary client-side configuration in `public/js/env-config.js` using values from your `.env` file.

## Production Deployment on Vercel

For production deployment on Vercel:

1. Set up environment variables in the Vercel dashboard:
   - Go to your project settings
   - Navigate to "Environment Variables"
   - Add the following variables:
     - `SUPABASE_URL`
     - `SUPABASE_ANON_KEY`

2. When you deploy to Vercel, the build process will automatically run the `generate-env-config.js` script, which will inject the environment variables into the client-side code.

## Security Considerations

- The `.env` file is included in `.gitignore` and should never be committed to your repository.
- The `public/js/env-config.js` file is also included in `.gitignore` to prevent accidental exposure of credentials.
- Only the Supabase anonymous key (`SUPABASE_ANON_KEY`) and URL (`SUPABASE_URL`) should be exposed to the client side.
- The service role key (`SUPABASE_SERVICE_KEY`) is only for server-side use and should never be exposed to the client.