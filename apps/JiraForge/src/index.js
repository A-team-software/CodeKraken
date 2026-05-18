import Resolver from '@forge/resolver';
import api, { invokeRemote, route } from '@forge/api';

const resolver = new Resolver();
const REMOTE_KEY = 'oliver-server';
const PROJECT_REPOSITORIES_PROPERTY_KEY = 'oliverai.project.repositories';

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
    body: { provider, accountId, cloudId },
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

function parseRepoId(repo) {
  if (repo?.repoId) return String(repo.repoId);
  if (repo?.id) return String(repo.id);
  const url = String(repo?.url || '');
  if (!url) return '';
  const parts = url.replace(/\/+$/, '').split('/');
  if (parts.length < 2) return '';
  return `${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
}

function resolveProjectIdOrKey(context, payload) {
  const fromPayload = payload?.projectIdOrKey;
  if (fromPayload) return String(fromPayload);

  const contextProject = context?.extension?.project;
  if (contextProject?.id) return String(contextProject.id);
  if (contextProject?.key) return String(contextProject.key);

  throw new Error('Missing project context. Expected project id or key.');
}

function normalizeRepositoryEntry(repo) {
  const id = parseRepoId(repo);
  const name = String(repo?.name || id || '').trim();
  const url = String(repo?.url || '').trim();
  const source = String(repo?.source || '').toLowerCase();
  const selected = repo?.selected !== false;

  if (!id || !name || !url || !source) {
    return null;
  }

  return {
    id,
    name,
    url,
    source,
    selected,
  };
}

async function getProjectRepositoriesProperty(projectIdOrKey) {
  const response = await api
    .asApp()
    .requestJira(route`/rest/api/3/project/${String(projectIdOrKey)}/properties/${PROJECT_REPOSITORIES_PROPERTY_KEY}`);

  if (response.status === 404) {
    return [];
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to load project repositories: ${response.status} ${errorText}`);
  }

  const property = await response.json();
  const repos = Array.isArray(property?.value?.repositories)
    ? property.value.repositories
    : Array.isArray(property?.value)
      ? property.value
      : [];

  return repos
    .map((repo) => normalizeRepositoryEntry(repo))
    .filter(Boolean);
}

async function putProjectRepositoriesProperty(projectIdOrKey, repositories) {
  const response = await api
    .asApp()
    .requestJira(route`/rest/api/3/project/${String(projectIdOrKey)}/properties/${PROJECT_REPOSITORIES_PROPERTY_KEY}`, {
      method: 'PUT',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ repositories }),
    });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to save project repositories: ${response.status} ${errorText}`);
  }
}

resolver.define('getProjectRepositories', async ({ context }) => {
  const projectIdOrKey = resolveProjectIdOrKey(context);
  return await getProjectRepositoriesProperty(projectIdOrKey);
});

resolver.define('saveProjectRepositories', async ({ payload, context }) => {
  const projectIdOrKey = resolveProjectIdOrKey(context, payload);

  const repositoriesFromPayload = Array.isArray(payload?.repositories)
    ? payload.repositories
    : null;

  let repositoriesToSave = [];

  if (repositoriesFromPayload) {
    repositoriesToSave = repositoriesFromPayload
      .map((repo) => normalizeRepositoryEntry(repo))
      .filter(Boolean);
  } else {
    const existing = await getProjectRepositoriesProperty(projectIdOrKey);
    const existingByUrl = new Map(existing.map((repo) => [repo.url, repo]));

    const added = Array.isArray(payload?.added) ? payload.added : [];
    const removed = Array.isArray(payload?.removed) ? payload.removed : [];

    for (const repo of added) {
      const normalized = normalizeRepositoryEntry(repo);
      if (normalized) {
        existingByUrl.set(normalized.url, normalized);
      }
    }

    for (const repo of removed) {
      const url = String(repo?.url || '').trim();
      if (url) {
        existingByUrl.delete(url);
      }
    }

    repositoriesToSave = Array.from(existingByUrl.values());
  }

  await putProjectRepositoriesProperty(projectIdOrKey, repositoriesToSave);
  return { saved: repositoriesToSave.length };
});

export const handler = resolver.getDefinitions();
