// OAuth Configuration and API credentials
// ⚠️ SECURITY WARNING:
// CLIENT_SECRET must be kept server-side only in .env.local or backend env vars
// PUBLIC configs are safe for frontend exposure

// GitHub OAuth Configuration
export const GITHUB_CLIENT_ID = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID || 'Iv23liaTUOBusnN30u00';
// CLIENT_SECRET is server-only, never exposed to frontend
export const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || '';
// Callback URL for OAuth redirect
export const GITHUB_CALLBACK_URL = process.env.GITHUB_CALLBACK_URL || 'https://oliver-server-qw6b.vercel.app/api/git/github/callback';
// NOTE: Reuses the main git callback which already handles Forge metadata correctly
// (checks metadata.forge flag, returns closeWindowResponse, stores to oauthtokens with atlassianAccountId+cloudId)
export const FORGE_GITHUB_CALLBACK_URL = process.env.FORGE_GITHUB_CALLBACK_URL || 'https://oliver-server-qw6b.vercel.app/api/git/github/callback';
export const JIRA_CLIENT_ID = process.env.NEXT_PUBLIC_JIRA_CLIENT_ID || '';
export const JIRA_CLIENT_SECRET = process.env.JIRA_CLIENT_SECRET || '';
export const JIRA_CALLBACK_URL = process.env.JIRA_CALLBACK_URL || 'https://oliver-server-qw6b.vercel.app/api/boards/jira/callback';
export const JIRA_SCOPES = 'read:jira-work read:jira-user offline_access read:me';

export const BITBUCKET_CLIENT_ID = process.env.NEXT_PUBLIC_BITBUCKET_CLIENT_ID || '';
export const BITBUCKET_CLIENT_SECRET = process.env.BITBUCKET_CLIENT_SECRET || '';
export const BITBUCKET_CALLBACK_URL = process.env.BITBUCKET_CALLBACK_URL || 'https://oliver-server-qw6b.vercel.app/api/git/bitbucket/callback';
export const FORGE_BITBUCKET_CALLBACK_URL = process.env.FORGE_BITBUCKET_CALLBACK_URL || 'https://oliver-server-qw6b.vercel.app/api/forge/oauth/bitbucket/callback';

// Trello OAuth Configuration
export const TRELLO_CLIENT_ID = process.env.NEXT_PUBLIC_TRELLO_CLIENT_ID || '';
export const TRELLO_API_KEY = TRELLO_CLIENT_ID; // Alias for consistency
export const TRELLO_CLIENT_SECRET = process.env.TRELLO_CLIENT_SECRET || '';
export const TRELLO_CALLBACK_URL = process.env.TRELLO_CALLBACK_URL || 'https://oliver-server-qw6b.vercel.app/api/boards/trello/callback';
export const TRELLO_SCOPES = 'read,write,account';

// Asana OAuth Configuration
export const ASANA_CLIENT_ID = process.env.NEXT_PUBLIC_ASANA_CLIENT_ID || '';
export const ASANA_CLIENT_SECRET = process.env.ASANA_CLIENT_SECRET || '';
export const ASANA_CALLBACK_URL = process.env.ASANA_CALLBACK_URL || 'https://oliver-server-qw6b.vercel.app/api/boards/asana/callback';
export const ASANA_SCOPES = 'default offline_access';

// Linear OAuth Configuration
export const LINEAR_CLIENT_ID = process.env.NEXT_PUBLIC_LINEAR_CLIENT_ID || '';
export const LINEAR_CLIENT_SECRET = process.env.LINEAR_CLIENT_SECRET || '';
export const LINEAR_CALLBACK_URL = process.env.LINEAR_CALLBACK_URL || 'https://oliver-server-qw6b.vercel.app/api/boards/linear/callback';
export const LINEAR_SCOPES = 'read,write,offline_access';

// OAuth Authorization URLs
export const GITHUB_AUTH_URL = 'https://github.com/login/oauth/authorize';
export const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';

export const JIRA_AUTH_URL = 'https://auth.atlassian.com/authorize';
export const JIRA_TOKEN_URL = 'https://auth.atlassian.com/oauth/token';

export const BITBUCKET_AUTH_URL = 'https://bitbucket.org/site/oauth2/authorize';
export const BITBUCKET_TOKEN_URL = 'https://bitbucket.org/site/oauth2/access_token';

export const TRELLO_AUTH_URL = 'https://trello.com/1/authorize';
export const TRELLO_TOKEN_URL = 'https://trello.com/1/OAuthGetAccessToken';

export const ASANA_AUTH_URL = 'https://app.asana.com/-/oauth_authorize';
export const ASANA_TOKEN_URL = 'https://app.asana.com/-/oauth_token';

export const LINEAR_AUTH_URL = 'https://linear.app/oauth/authorize';
export const LINEAR_TOKEN_URL = 'https://api.linear.app/oauth/token';

// CORS Proxy for development (needed for token endpoints that don't support CORS)
export const CORS_PROXY = process.env.NEXT_PUBLIC_CORS_PROXY || 'https://cors-anywhere.herokuapp.com/';

// Token configuration
export const TOKEN_COOKIE_NAME = 'git_provider_token';
export const TOKEN_COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds
