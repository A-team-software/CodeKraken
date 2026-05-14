import Resolver from '@forge/resolver';
import api, { invokeRemote, route } from '@forge/api';

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

resolver.define('getGitAuthUrl', async ({ payload, context }) => {
  const provider = payload?.provider;
  if (!provider) throw new Error('Provider is required');
  
  return await backendFetch('/api/forge/git/auth-url', {
    method: 'POST',
    body: { provider },
    context
  });
});

resolver.define('getGitStatus', async ({ payload, context }) => {
  const provider = payload?.provider;
  if (!provider) throw new Error('Provider is required');

  const accountId = context?.accountId;
  const cloudId = context?.cloudId;
  if (!accountId || !cloudId) {
    throw new Error('Missing accountId or cloudId');
  }
  
  try {
    return await backendFetch('/api/forge/git/status', {
      method: 'POST',
      body: { provider, accountId, cloudId },
      context
    });
  } catch (error) {
    console.error(`getGitStatus error: ${error?.message}`);
    return { connected: false, error: error?.message || 'Failed to get git status' };
  }
});

resolver.define('disconnect', async ({ payload, context }) => {
  const provider = payload?.provider;
  if (!provider) throw new Error('Provider is required');
  
  return await backendFetch('/api/forge/git/disconnect', {
    method: 'POST',
    body: { provider },
    context
  });
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

resolver.define('startTaskDevelopment', async ({ payload, context }) => {
  const issue = payload?.issue;
  const repoUrl = payload?.repoUrl;
  if (!issue?.id || !issue?.key || !issue?.fields?.summary) {
    throw new Error('Missing issue details. Expected issue.id, issue.key, and issue.fields.summary.');
  }
  if (!repoUrl) {
    throw new Error('Missing repoUrl for startTaskDevelopment');
  }

  const webhookEvent = payload?.webhookEvent || 'jira:issue_created';

  return await backendFetch('/api/task?provider=jira', {
    method: 'POST',
    body: {
      repoUrl,
      webhookEvent,
      issue,
    },
    context
  });
});

resolver.define('getProjectDetails', async ({ payload }) => {
  const projectIdOrKey = payload?.projectIdOrKey;

  if (!projectIdOrKey) {
    throw new Error('projectIdOrKey is required');
  }

  try {
    console.log(`[getProjectDetails] Fetching project: ${projectIdOrKey}`);
    const response = await api.asApp().requestJira(route`/rest/api/3/project/${String(projectIdOrKey)}`);
    
    console.log(`[getProjectDetails] Response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[getProjectDetails] Error response: ${response.status} - ${errorText}`);
      throw new Error(`Failed to fetch project details: ${response.status} ${errorText}`);
    }

    const project = await response.json();
    const iconUrl =
      project?.avatarUrls?.['48x48'] ||
      project?.avatarUrls?.['32x32'] ||
      project?.avatarUrls?.['24x24'] ||
      project?.avatarUrls?.['16x16'] ||
      null;
    
    return {
      id: project?.id ? String(project.id) : null,
      key: project?.key ? String(project.key) : null,
      name: project?.name ? String(project.name) : null,
      iconUrl,
    };
  } catch (error) {
    console.error(`[getProjectDetails] Exception: ${error?.message || error}`);
    throw error;
  }
});

resolver.define('saveProjectRepositories', async ({ payload, context }) => {
  const endpoint = payload?.endpoint;
  const savePayload = payload?.payload;

  if (!endpoint) throw new Error('Endpoint is required');
  if (!savePayload) throw new Error('Payload is required');

  return await backendFetch(endpoint, {
    method: 'POST',
    body: savePayload,
    context
  });
});

export const handler = resolver.getDefinitions();
