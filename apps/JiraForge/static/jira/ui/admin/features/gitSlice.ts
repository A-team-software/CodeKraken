import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { z } from 'zod';
import get from 'lodash/get';
import { Effect, Either } from 'effect';
import { safeInvokeEffect, runEffectThunk } from '../utils/effectAsync';

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

type Provider = z.infer<typeof ProviderSchema>;
type Status = z.infer<typeof StatusSchema>;
type Workspace = z.infer<typeof WorkspaceSchema>;
type Repo = z.infer<typeof RepoSchema>;

export interface GitState {
  auth: { connected: boolean; loading: boolean; username: string | null };
  provider: string;
  providers: Provider[];
  discoveryDone: boolean;
  workspace: string;
  workspaces: Workspace[];
  workspacesLoading: boolean;
  repoUrl: string;
  repos: Repo[];
  reposLoading: boolean;
  connecting: boolean;
  error: string | null;
  successMessage: string | null;
}

const initialState: GitState = {
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
  successMessage: null,
};

// --- Thunks ---
export const fetchProviders = createAsyncThunk('git/fetchProviders', async (_, { rejectWithValue }) => {
  const effect = safeInvokeEffect('getGitProviders');
  const res = await runEffectThunk(effect, rejectWithValue);
  const providers = get(res, 'providers', []);
  return z.array(ProviderSchema).parse(providers);
});

export const refreshAuthStatus = createAsyncThunk('git/refreshAuthStatus', async (provider: string | undefined, { getState, rejectWithValue }) => {
  const state = (getState() as any).git as GitState;
  const targetProvider = provider || state.provider;
  const isDiscovery = !targetProvider && !state.discoveryDone;

  if (isDiscovery) {
    const ghEffect = safeInvokeEffect('getGitStatus', { provider: 'github' });
    const bbEffect = safeInvokeEffect('getGitStatus', { provider: 'bitbucket' });

    const [ghEither, bbEither] = await Promise.all([
      Effect.runPromise(Effect.either(ghEffect)),
      Effect.runPromise(Effect.either(bbEffect))
    ]);

    const gh = Either.isRight(ghEither) ? ghEither.right : { connected: false };
    const bb = Either.isRight(bbEither) ? bbEither.right : { connected: false };

    if ((gh as any)?.connected) {
      return { ...StatusSchema.parse(gh), provider: 'github', discoveryDone: true };
    } else if ((bb as any)?.connected) {
      return { ...StatusSchema.parse(bb), provider: 'bitbucket', discoveryDone: true };
    } else {
      return { connected: false, provider: 'github', discoveryDone: true };
    }
  }

  const effect = safeInvokeEffect('getGitStatus', { provider: targetProvider });
  const status = await runEffectThunk(effect, rejectWithValue);
  return { ...StatusSchema.parse(status), provider: targetProvider };
});

export const fetchWorkspaces = createAsyncThunk('git/fetchWorkspaces', async (_, { getState, rejectWithValue }) => {
  const provider = (getState() as any).git.provider;
  if (provider !== 'bitbucket') return [];
  const effect = safeInvokeEffect('getWorkspaces', { provider } as any);
  const res = await runEffectThunk(effect, rejectWithValue);
  const workspaces = get(res, 'workspaces', []);
  return z.array(WorkspaceSchema).parse(workspaces);
});

export const fetchRepositories = createAsyncThunk('git/fetchRepositories', async (_, { getState, rejectWithValue }) => {
  const { provider, workspace, auth } = (getState() as any).git as GitState;
  
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

  const effect = safeInvokeEffect('getRepositories', { provider, workspace, page: 1, perPage: 50 });
  const res = await runEffectThunk(effect, rejectWithValue);
  const reposData = Array.isArray(get(res, 'repositories')) ? res.repositories : Array.isArray(res) ? res : [];
  const validRepos = z.array(RepoSchema).parse(reposData);
  sessionStorage.setItem(cacheKey, JSON.stringify(validRepos));
  return validRepos;
});

export const disconnectGit = createAsyncThunk('git/disconnectGit', async (_, { getState, dispatch, rejectWithValue }) => {
  const provider = (getState() as any).git.provider;
  const effect = safeInvokeEffect('disconnect', { provider });
  await runEffectThunk(effect, rejectWithValue);
  await dispatch(refreshAuthStatus(provider));
});

// --- Slice ---
export const gitSlice = createSlice({
  name: 'git',
  initialState,
  reducers: {
    setProvider(state, action: PayloadAction<string>) {
      state.provider = action.payload;
    },
    setWorkspace(state, action: PayloadAction<string>) {
      state.workspace = action.payload;
      state.repoUrl = '';
    },
    setRepoUrl(state, action: PayloadAction<string>) {
      state.repoUrl = action.payload;
    },
    setConnecting(state, action: PayloadAction<boolean>) {
      state.connecting = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
    setSuccessMessage(state, action: PayloadAction<string | null>) {
      state.successMessage = action.payload;
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
        state.error = null;
        state.successMessage = null;
      })
      .addCase(refreshAuthStatus.fulfilled, (state, action) => {
        state.auth.loading = false;
        
        const newlyConnected = action.payload.connected && !state.auth.connected;
        state.auth.connected = action.payload.connected;
        
        if (newlyConnected) {
          state.successMessage = `Successfully connected to ${action.payload.provider === 'bitbucket' ? 'Bitbucket' : 'GitHub'}.`;
        }

        if (action.payload.username) {
          state.auth.username = action.payload.username;
        } else if (action.payload.connected) {
           state.auth.username = action.payload.provider === 'bitbucket' ? 'Bitbucket User' : 'GitHub User';
        }
        if ((action.payload as any).provider) {
           state.provider = (action.payload as any).provider;
        }
        if ((action.payload as any).discoveryDone) {
           state.discoveryDone = (action.payload as any).discoveryDone;
        }
      })
      .addCase(refreshAuthStatus.rejected, (state, action) => {
        state.auth.loading = false;
        state.auth.connected = false;
        state.error = `Connection check failed: ${action.payload || 'Unknown error'}`;
      })
      .addCase(fetchWorkspaces.pending, (state) => {
        state.workspacesLoading = true;
      })
      .addCase(fetchWorkspaces.fulfilled, (state, action) => {
        state.workspacesLoading = false;
        state.workspaces = action.payload;
      })
      .addCase(fetchWorkspaces.rejected, (state, action) => {
        state.workspacesLoading = false;
        state.workspaces = [];
        state.error = `Failed to fetch workspaces: ${action.payload || 'Unknown error'}`;
      })
      .addCase(fetchRepositories.pending, (state) => {
        state.reposLoading = true;
      })
      .addCase(fetchRepositories.fulfilled, (state, action) => {
        state.reposLoading = false;
        state.repos = action.payload;
      })
      .addCase(fetchRepositories.rejected, (state, action) => {
        state.reposLoading = false;
        state.repos = [];
        state.error = `Failed to fetch repositories: ${action.payload || 'Unknown error'}`;
      })
      .addCase(disconnectGit.fulfilled, (state) => {
        state.successMessage = 'Successfully disconnected from Git provider.';
      });
  },
});

export const { setProvider, setWorkspace, setRepoUrl, setConnecting, setError, setSuccessMessage } = gitSlice.actions;
export default gitSlice.reducer;
