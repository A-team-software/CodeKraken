import Resolver from '@forge/resolver';
import { fetch } from '@forge/api';

const resolver = new Resolver();
// ─── AUTH BOUNDARY (New Arch) ────────────────────────────────────────────────

/**
 * Helper to get the shared secret with the backend.
 * Fallback to extracting the UUID from FORGE_APP_ID if API_SECRET is not set.
 */
function getApiSecret() {
  const secret = process.env.API_SECRET;
  if (secret) {
    console.log("Forge Auth: Using API_SECRET from environment variables.");
    return secret;
  }

  // Forge App ID looks like "ari:cloud:ecosystem::app/a2d49ed1-bb5e-4c26-b5fd-585625d4cab8"
  const appId = process.env.FORGE_APP_ID;
  if (appId && appId.includes('/')) {
    const uuid = appId.split('/').pop();
    console.log(`Forge Auth: Using UUID from FORGE_APP_ID (${uuid.substring(0, 4)}...).`);
    return uuid;
  }

  console.warn("Forge Auth: No API_SECRET or FORGE_APP_ID found!");
  return undefined;
}

resolver.define('getGithubAuthUrl', async (req) => {
  const { accountId, cloudId } = req.context;
  const qs = new URLSearchParams({ accountId, cloudId });

  console.log(`getGithubAuthUrl (aligned): accountId=${accountId}, cloudId=${cloudId}`);

  // Calls Elysia: GET /api/forge/git/github/oauth
  const data = await backendFetch(`api/forge/git/github/oauth?${qs.toString()}`, { context: req.context });
  
  // The Elysia route returns { loginUrl: "..." }
  // Mapping loginUrl to authUrl for frontend compatibility if needed, 
  // but we'll also update the frontend.
  return {
    authUrl: data.loginUrl,
    loginUrl: data.loginUrl
  };
});

resolver.define('getGithubStatus', async (req) => {
  const provider = req.payload?.provider || 'github';

  console.log(`getGithubStatus (aligned): provider=${provider}`);

  // Calls Elysia: GET /api/forge/identity/status
  const qs = new URLSearchParams({ provider });
  return await backendFetch(`api/forge/identity/status?${qs.toString()}`, { context: req.context });
});

resolver.define('disconnect', async (req) => {
  // Calls Elysia: POST /api/forge/github/disconnect (If it exists) 
  // Fallback to manual if needed, but let's try to standardize.
  // For now keeping manual but using backendFetch utility.
  return await backendFetch('api/forge/github/disconnect', { 
    method: 'POST',
    body: { clientKey: req.context.cloudId },
    context: req.context 
  });
});


// ─── OTHER EXISTING ENDPOINTS ───────────────────────────────────────────────

/**
 * Utility for the existing endpoints.
 */
async function backendFetch(path, { method = 'GET', body, context } = {}) {
  const url = `https://oliver-server-qw6b.vercel.app/${path}`;
  const secret = getApiSecret();
  const headers = {
    'Accept': 'application/json',
    'Authorization': `Bearer ${secret}`
  };

  if (context) {
    const { accountId, cloudId } = context;
    if (accountId) headers['X-Forge-Account-Id'] = accountId;
    if (cloudId) headers['X-Forge-Client-Key'] = cloudId;
  }

  if (method !== 'GET' && body) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const payload = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    throw new Error(isJson && payload.error ? payload.error : `Request failed: ${res.status}`);
  }

  return payload;
}

resolver.define('getGitProviders', async ({ context }) => {
  return await backendFetch('api/forge/git/providers', { context });
});

resolver.define('getGithubToken', async ({ context }) => {
  return await backendFetch('api/forge/github/token', { context });
});

resolver.define('getRepositories', async ({ payload, context }) => {
  const provider = payload?.provider || 'github';
  const page = payload?.page ?? 1;
  const perPage = payload?.perPage ?? 50;

  const qs = new URLSearchParams({ page: String(page), perPage: String(perPage), provider });
  return await backendFetch(
    `api/forge/repositories?${qs.toString()}`,
    { context }
  );
});

resolver.define('solveTask', async ({ payload, context }) => {
  const provider = payload?.provider || 'github';
  const task = payload?.task;
  const repoUrl = payload?.repoUrl;

  if (!task || !repoUrl) {
    throw new Error('Missing task or repoUrl');
  }

  return await backendFetch('api/solve', {
    method: 'POST',
    body: {
      task,
      repoUrl,
      provider,
    },
    context
  });
});

export const handler = resolver.getDefinitions();
