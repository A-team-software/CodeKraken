import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { invoke, view } from '@forge/bridge';
import { z } from 'zod';

const ContextSchema = z.any();

export const loadContext = createAsyncThunk('task/loadContext', async () => {
  const ctx = await view.getContext();
  return ContextSchema.parse(ctx);
});

export const solveTaskThunk = createAsyncThunk('task/solveTask', async ({ provider, repoUrl, task }, { dispatch, rejectWithValue }) => {
  try {
    const res = await invoke('solveTask', { provider, repoUrl, task });
    return res;
  } catch (e) {
    if (e?.status === 401) {
      dispatch({ type: 'git/refreshAuthStatus/fulfilled', payload: { connected: false } });
    }
    return rejectWithValue(e?.payload?.error || e?.message || String(e));
  }
});

export const taskSlice = createSlice({
  name: 'task',
  initialState: {
    ctx: null,
    taskInput: '',
    running: false,
    result: null,
    error: null,
    warning: null,
  },
  reducers: {
    setTaskInput(state, action) {
      state.taskInput = action.payload;
    },
    clearTaskResult(state) {
      state.result = null;
      state.error = null;
      state.warning = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadContext.fulfilled, (state, action) => {
        state.ctx = action.payload;
        
        const issue = action.payload?.extension?.issue;
        const key = issue?.key ? `${issue.key}` : '';
        const summary = issue?.summary ? `${issue.summary}` : '';
        const description = issue?.description ? `${issue.description}` : '';
        const parts = [];
        if (key || summary) parts.push(`[${key}] ${summary}`.trim());
        if (description) parts.push(description);
        
        const inferred = parts.join('\n\n').trim();
        if (inferred) state.taskInput = inferred;
      })
      .addCase(solveTaskThunk.pending, (state) => {
        state.running = true;
        state.error = null;
        state.warning = null;
        state.result = null;
      })
      .addCase(solveTaskThunk.fulfilled, (state, action) => {
        state.running = false;
        state.result = action.payload;
      })
      .addCase(solveTaskThunk.rejected, (state, action) => {
        state.running = false;
        state.error = action.payload;
      });
  },
});

export const { setTaskInput, clearTaskResult } = taskSlice.actions;
export default taskSlice.reducer;
