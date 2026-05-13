import Resolver from '@forge/resolver';
import { invokeRemote } from '@forge/api';

const resolver = new Resolver();
const REMOTE_KEY = 'oliver-server';

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

resolver.define('getGitAuthUrl', async (req) => {
  const { accountId, cloudId } = req.context;
  const provider = req.payload?.provider;
  const secret = getApiSecret();

  console.log(`getGitAuthUrl: accountId=${accountId}, cloudId=${cloudId}, provider=${provider}, secretPresented=${!!secret}`);

  if (!provider) {
    throw new Error('Provider is required for getGitAuthUrl');
  }

  const res = await invokeRemote(REMOTE_KEY, {
    path: '/api/forge/git/auth-url',
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ accountId, cloudId, provider })
  });

  console.log(`Forge: getGitAuthUrl response status: ${res.status}`);
  if (!res.ok) {
    const text = await res.text();
    console.error(`Forge: getGitAuthUrl failed: ${text}`);
    return { error: text, status: res.status };
  }

  return res.json();
});

resolver.define('getGitStatus', async (req) => {
  const { accountId, cloudId } = req.context;
  const provider = req.payload?.provider;
  const secret = getApiSecret();

  console.log(`getGitStatus: accountId=${accountId}, cloudId=${cloudId}, provider=${provider}, secretPresented=${!!secret}`);

  const res = await invokeRemote(REMOTE_KEY, {
    path: '/api/forge/git/status',
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getApiSecret()}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ accountId, cloudId, clientKey: cloudId, provider })
  });

  console.log(`Forge: getGitStatus response status: ${res.status}`);
  if (!res.ok) {
    const text = await res.text();
    console.error(`Forge: getGitStatus failed: ${text}`);
    return { connected: false, error: text };
  }

  const data = await res.json();
  console.log(`Forge: getGitStatus result: connected=${data.connected}`);
  return data;
});

resolver.define('disconnect', async (req) => {
  const { accountId, cloudId } = req.context;
  const provider = req.payload?.provider;
  const secret = getApiSecret();

  console.log(`disconnect: accountId=${accountId}, cloudId=${cloudId}, provider=${provider}, secretPresented=${!!secret}`);

  const res = await invokeRemote(REMOTE_KEY, {
    path: '/api/forge/git/disconnect',
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ accountId, cloudId, clientKey: cloudId, provider })
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error(`disconnect failed: status=${res.status}, error=${errorText}`);
    throw new Error(`Failed to disconnect: ${res.status} (${errorText})`);
  }

  return res.json();
});


// ─── OTHER EXISTING ENDPOINTS ───────────────────────────────────────────────

/**
 * Utility for the existing endpoints.
 */
async function backendFetch(path, { method = 'GET', body, context } = {}) {
  const normalizedPath = `/${path.replace(/^\/+/, '')}`;
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

  const res = await invokeRemote(REMOTE_KEY, {
    path: normalizedPath,
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
  return await backendFetch('/api/forge/git/providers', { context });
});


resolver.define('getWorkspaces', async ({ payload, context }) => {
  const provider = payload?.provider;
  if (!provider) throw new Error('Provider is required');
  const qs = new URLSearchParams({ provider });
  return await backendFetch(`/api/forge/workspaces?${qs.toString()}`, { context });
});

resolver.define('getRepositories', async ({ payload, context }) => {
  const provider = payload?.provider;
  if (!provider) throw new Error('Provider is required');
  const workspace = payload?.workspace;
  const page = payload?.page ?? 1;
  const perPage = payload?.perPage ?? 50;

  const qs = new URLSearchParams({ page: String(page), perPage: String(perPage) });
  if (workspace) qs.append('workspace', workspace);
  return await backendFetch(
    `/api/git/${provider}/repositories?${qs.toString()}`,
    { context }
  );
});

resolver.define('solveTask', async ({ payload, context }) => {
  const provider = payload?.provider;
  if (!provider) throw new Error('Provider is required');
  const task = payload?.task;
  const repoUrl = payload?.repoUrl;

  if (!task || !repoUrl) {
    throw new Error('Missing task or repoUrl');
  }

  return await backendFetch('/api/solve', {
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
