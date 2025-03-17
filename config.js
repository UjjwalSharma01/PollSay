const isCodespace = process.env.CODESPACE === 'true';
const appUrl = isCodespace
  ? process.env.CODESPACE_NAME
    ? `https://${process.env.CODESPACE_NAME}-${process.env.GITHUB_USER}.github.dev`
    : 'http://localhost:3000' // Default if CODESPACE_NAME is not set
  : 'http://localhost:3000'; // Default for local development

export const APP_URL = appUrl;