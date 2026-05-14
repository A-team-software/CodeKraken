import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { z } from 'zod';
import { Effect, Either } from 'effect';
import { safeInvokeEffect, safeViewContextEffect, runEffectThunk } from '../utils/effectAsync';

const ContextSchema = z.any();

export const loadContext = createAsyncThunk('task/loadContext', async (_, { rejectWithValue }) => {
  const effect = safeViewContextEffect();
  const ctx = await runEffectThunk(effect, rejectWithValue);
  return ContextSchema.parse(ctx);
});

export const solveTaskThunk = createAsyncThunk('task/solveTask', async ({ provider, repoUrl, task }, { dispatch, rejectWithValue }) => {
  const effect = safeInvokeEffect('solveTask', { provider, repoUrl, task });
  const result = await Effect.runPromise(Effect.either(effect));

  if (Either.isRight(result)) {
    return result.right;
  } else {
    const errStr = result.left;
    if (errStr.includes('Unauthorized (401)')) {
      dispatch({ type: 'git/refreshAuthStatus/fulfilled', payload: { connected: false } });
    }
    return rejectWithValue(errStr);
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
    successMessage: null,
  },
  reducers: {
    setTaskInput(state, action) {
      state.taskInput = action.payload;
    },
    clearTaskResult(state) {
      state.result = null;
      state.error = null;
      state.warning = null;
      state.successMessage = null;
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
        state.successMessage = null;
      })
      .addCase(solveTaskThunk.fulfilled, (state, action) => {
        state.running = false;
        state.result = action.payload;
        state.successMessage = 'Task completed successfully.';
      })
      .addCase(solveTaskThunk.rejected, (state, action) => {
        state.running = false;
        state.error = action.payload;
        state.successMessage = null;
      });
  },
});

export const { setTaskInput, clearTaskResult } = taskSlice.actions;
export default taskSlice.reducer;
