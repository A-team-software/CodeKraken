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
  const accountId = context?.accountId;
  const cloudId = context?.cloudId;
  if (!accountId || !cloudId) throw new Error('Missing accountId or cloudId');

  return await backendFetch('/api/forge/git/auth-url', {
    method: 'POST',
    body: { accountId, cloudId, provider },
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
  const accountId = context?.accountId;
  const cloudId = context?.cloudId;
  if (!accountId || !cloudId) throw new Error('Missing accountId or cloudId');

  return await backendFetch('/api/forge/git/disconnect', {
    method: 'POST',
    body: { provider, accountId, cloudId },
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
    // ApiRes error shape: { error: string, code: number }
    const errMsg = isJson && (payload?.error || payload?.message)
      ? (payload.error || payload.message)
      : `Request failed: ${res.status}`;
    throw new Error(errMsg);
  }

  // Unwrap the ApiRes envelope: { data: {...}, code: 200 } → {...}
  if (isJson && payload !== null && typeof payload === 'object' && 'data' in payload && 'code' in payload) {
    return payload.data;
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

function normalizeRepoName(repo) {
  return repo?.fullName || repo?.name || '';
}

function normalizeRepoUrl(repo, provider) {
  return repo?.htmlUrl || repo?.url || repo?.cloneUrl || repo?.links?.html?.href || '';
}

function filterByQuery(repositories, query) {
  const normalizedQuery = String(query || '').trim().toLowerCase();
  if (!normalizedQuery) return repositories;
  return repositories.filter((repo) => {
    const name = normalizeRepoName(repo).toLowerCase();
    const url = normalizeRepoUrl(repo).toLowerCase();
    return name.includes(normalizedQuery) || url.includes(normalizedQuery);
  });
}

resolver.define('searchGitHubRepositories', async ({ payload, context }) => {
  const query = payload?.query;
  if (!query || !String(query).trim()) return [];

  const response = await backendFetch('/api/git/github/repositories?page=1&perPage=100', { context });
  const repositories = Array.isArray(response) ? response : (response?.repositories || []);
  return filterByQuery(repositories, query).slice(0, 20).map((repo) => {
    const fullName = normalizeRepoName(repo);
    const [owner, name] = String(fullName).split('/');
    return {
      id: String(repo?.id || fullName || `gh-${name || 'repo'}`),
      name: name || repo?.name || fullName,
      owner: owner || repo?.owner || undefined,
      url: normalizeRepoUrl(repo, 'github'),
    };
  });
});

resolver.define('searchBitbucketRepositories', async ({ payload, context }) => {
  const query = payload?.query;
  if (!query || !String(query).trim()) return [];

  const response = await backendFetch('/api/git/bitbucket/repositories?page=1&perPage=100', { context });
  const repositories = Array.isArray(response) ? response : (response?.repositories || []);
  return filterByQuery(repositories, query).slice(0, 20).map((repo) => {
    const fullName = normalizeRepoName(repo);
    const [workspace, name] = String(fullName).split('/');
    return {
      id: String(repo?.id || fullName || `bb-${name || 'repo'}`),
      name: name || repo?.name || fullName,
      workspace: workspace || repo?.workspace || undefined,
      url: normalizeRepoUrl(repo, 'bitbucket'),
    };
  });
});

resolver.define('searchGitlabRepositories', async ({ payload }) => {
  const query = payload?.query;
  if (!query || !String(query).trim()) return [];
  // GitLab is not wired in the backend yet; expose a stable no-op resolver for the UI.
  return [];
});

resolver.define('solveTask', async ({ payload, context }) => {
  const provider = payload?.provider;
  if (!provider) throw new Error('Provider is required');
  const task = payload?.task;
  const repoUrl = payload?.repoUrl;

  if (!task || !repoUrl) {
    throw new Error('Missing task or repoUrl');
  }

  return await backendFetch("/api/solve", {
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

function sourceToProvider(source) {
  if (source === 'github') return 'GITHUB';
  if (source === 'bitbucket') return 'BITBUCKET';
  return null;
}

function parseRepoId(repo) {
  if (repo?.repoId) return String(repo.repoId);
  if (repo?.id) return String(repo.id);
  const url = String(repo?.url || '');
  if (!url) return '';
  const parts = url.replace(/\/+$/, '').split('/');
  if (parts.length < 2) return '';
  return `${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
}

resolver.define('getProjectRepositories', async ({ context }) => {
  const cloudId = context?.cloudId;
  if (!cloudId) throw new Error('Missing cloudId');

  const response = await backendFetch(`/api/sites/${encodeURIComponent(cloudId)}/repositories`, { context });
  const repos = response?.repos || [];
  return repos.map((repo) => {
    const provider = String(repo?.provider || '').toLowerCase();
    const source = provider === 'github' ? 'github' : provider === 'bitbucket' ? 'bitbucket' : 'github';
    return {
      id: parseRepoId(repo),
      name: repo?.repoFullName || parseRepoId(repo),
      url: repo?.htmlUrl || '',
      source,
      selected: true,
    };
  });
});

resolver.define('saveProjectRepositories', async ({ payload, context }) => {
  const cloudId = context?.cloudId;
  if (!cloudId) throw new Error('Missing cloudId');

  const added = Array.isArray(payload?.added) ? payload.added : [];
  const removed = Array.isArray(payload?.removed) ? payload.removed : [];

  const results = { added: 0, removed: 0 };

  for (const repo of added) {
    const provider = sourceToProvider(repo?.source);
    if (!provider) continue;
    const repoId = parseRepoId(repo);
    const repoFullName = repo?.name || repoId;
    const htmlUrl = repo?.url;
    if (!repoId || !repoFullName || !htmlUrl) continue;

    await backendFetch(`/api/sites/${encodeURIComponent(cloudId)}/repositories`, {
      method: 'POST',
      body: { repoId, repoFullName, provider, htmlUrl },
      context,
    });
    results.added += 1;
  }

  for (const repo of removed) {
    const provider = sourceToProvider(repo?.source);
    if (!provider) continue;
    const repoId = parseRepoId(repo);
    if (!repoId) continue;

    await backendFetch(
      `/api/sites/${encodeURIComponent(cloudId)}/repositories/${encodeURIComponent(provider)}/${encodeURIComponent(repoId)}`,
      { method: 'DELETE', context }
    );
    results.removed += 1;
  }

  return results;
});

export const handler = resolver.getDefinitions();
