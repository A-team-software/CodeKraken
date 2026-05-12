import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { invoke } from '@forge/bridge';
import { z } from 'zod';
import get from 'lodash/get';

// --- Zod Schemas ---
const ProviderSchema = z.object({
  id: z.string(),
  name: z.string(),
});

const StatusSchema = z.object({
  connected: z.boolean(),
  provider: z.string().optional(),
  username: z.string().optional(),
});

const WorkspaceSchema = z.object({
  slug: z.string(),
  name: z.string().optional(),
});

const RepoSchema = z.object({
  fullName: z.string().optional(),
  owner: z.string().optional(),
  name: z.string().optional(),
  cloneUrl: z.string().optional(),
  htmlUrl: z.string().optional(),
});

// --- Thunks ---
export const fetchProviders = createAsyncThunk('git/fetchProviders', async () => {
  const res = await invoke('getGitProviders');
  const providers = get(res, 'providers', []);
  return z.array(ProviderSchema).parse(providers);
});

export const refreshAuthStatus = createAsyncThunk('git/refreshAuthStatus', async (provider, { getState, rejectWithValue }) => {
  const state = getState().git;
  const targetProvider = provider || state.provider;
  const isDiscovery = !targetProvider && !state.discoveryDone;

  try {
    if (isDiscovery) {
      const [gh, bb] = await Promise.all([
        invoke('getGitStatus', { provider: 'github' }).catch(() => ({ connected: false })),
        invoke('getGitStatus', { provider: 'bitbucket' }).catch(() => ({ connected: false }))
      ]);

      if (gh?.connected) {
        return { ...StatusSchema.parse(gh), provider: 'github', discoveryDone: true };
      } else if (bb?.connected) {
        return { ...StatusSchema.parse(bb), provider: 'bitbucket', discoveryDone: true };
      } else {
        return { connected: false, provider: 'github', discoveryDone: true };
      }
    }

    const status = await invoke('getGitStatus', { provider: targetProvider });
    return { ...StatusSchema.parse(status), provider: targetProvider };
  } catch (err) {
    return rejectWithValue(err.message || 'Failed to check status');
  }
});

export const fetchWorkspaces = createAsyncThunk('git/fetchWorkspaces', async (_, { getState }) => {
  const provider = getState().git.provider;
  if (provider !== 'bitbucket') return [];
  const res = await invoke('getWorkspaces', { provider });
  const workspaces = get(res, 'workspaces', []);
  return z.array(WorkspaceSchema).parse(workspaces);
});

export const fetchRepositories = createAsyncThunk('git/fetchRepositories', async (_, { getState }) => {
  const { provider, workspace, auth } = getState().git;
  
  if (!auth.connected) return [];
  if (provider === 'bitbucket' && !workspace) return [];

  const cacheKey = `repos-${provider}-${workspace || 'default'}`;
  const cached = sessionStorage.getItem(cacheKey);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return z.array(RepoSchema).parse(parsed);
      }
    } catch (e) {
      console.error('Failed to parse cached repositories:', e);
    }
  }

  const res = await invoke('getRepositories', { provider, workspace, page: 1, perPage: 50 });
  const reposData = Array.isArray(get(res, 'repositories')) ? res.repositories : Array.isArray(res) ? res : [];
  const validRepos = z.array(RepoSchema).parse(reposData);
  sessionStorage.setItem(cacheKey, JSON.stringify(validRepos));
  return validRepos;
});

export const disconnectGit = createAsyncThunk('git/disconnectGit', async (_, { getState, dispatch }) => {
  const provider = getState().git.provider;
  await invoke('disconnect', { provider });
  await dispatch(refreshAuthStatus(provider));
});

// --- Slice ---
export const gitSlice = createSlice({
  name: 'git',
  initialState: {
    auth: { connected: false, loading: true, username: null },
    provider: '',
    providers: [
      { id: 'github', name: 'GitHub' },
      { id: 'bitbucket', name: 'Bitbucket' },
    ],
    discoveryDone: false,
    workspace: '',
    workspaces: [],
    workspacesLoading: false,
    repoUrl: '',
    repos: [],
    reposLoading: false,
    connecting: false,
    error: null,
  },
  reducers: {
    setProvider(state, action) {
      state.provider = action.payload;
    },
    setWorkspace(state, action) {
      state.workspace = action.payload;
      state.repoUrl = '';
    },
    setRepoUrl(state, action) {
      state.repoUrl = action.payload;
    },
    setConnecting(state, action) {
      state.connecting = action.payload;
    },
    setError(state, action) {
      state.error = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProviders.fulfilled, (state, action) => {
        if (action.payload.length > 0) {
          state.providers = action.payload;
          if (!state.provider && !state.discoveryDone) {
            state.provider = action.payload[0].id;
          }
        }
      })
      .addCase(refreshAuthStatus.pending, (state) => {
        state.auth.loading = true;
      })
      .addCase(refreshAuthStatus.fulfilled, (state, action) => {
        state.auth.loading = false;
        state.auth.connected = action.payload.connected;
        if (action.payload.username) {
          state.auth.username = action.payload.username;
        } else if (action.payload.connected) {
           state.auth.username = action.payload.provider === 'bitbucket' ? 'Bitbucket User' : 'GitHub User';
        }
        if (action.payload.provider) {
           state.provider = action.payload.provider;
        }
        if (action.payload.discoveryDone) {
           state.discoveryDone = action.payload.discoveryDone;
        }
      })
      .addCase(refreshAuthStatus.rejected, (state, action) => {
        state.auth.loading = false;
        state.auth.connected = false;
        state.error = `Auth check failed: ${action.payload}`;
      })
      .addCase(fetchWorkspaces.pending, (state) => {
        state.workspacesLoading = true;
      })
      .addCase(fetchWorkspaces.fulfilled, (state, action) => {
        state.workspacesLoading = false;
        state.workspaces = action.payload;
      })
      .addCase(fetchWorkspaces.rejected, (state) => {
        state.workspacesLoading = false;
        state.workspaces = [];
      })
      .addCase(fetchRepositories.pending, (state) => {
        state.reposLoading = true;
      })
      .addCase(fetchRepositories.fulfilled, (state, action) => {
        state.reposLoading = false;
        state.repos = action.payload;
      })
      .addCase(fetchRepositories.rejected, (state) => {
        state.reposLoading = false;
        state.repos = [];
      });
  },
});

export const { setProvider, setWorkspace, setRepoUrl, setConnecting, setError } = gitSlice.actions;
export default gitSlice.reducer;
