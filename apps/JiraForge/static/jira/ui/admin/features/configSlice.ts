import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import get from 'lodash/get';
import { safeInvokeEffect, runEffectThunk } from '../utils/effectAsync';

export interface ConfigState {
  incrementalPrsOn: boolean;
  loading: boolean;
  error: string | null;
  successMessage: string | null;
  currentRequestId: string | null;
}

const initialState: ConfigState = {
  incrementalPrsOn: false,
  loading: false,
  error: null,
  successMessage: null,
  currentRequestId: null,
};

export const fetchConfig = createAsyncThunk('config/fetchConfig', async (_, { rejectWithValue }) => {
  const effect = safeInvokeEffect('getConfig');
  const res = await runEffectThunk(effect, rejectWithValue);
  return get(res, 'config.incrementalPrsOn', false) as boolean;
});

export const updateConfig = createAsyncThunk('config/updateConfig', async (incrementalPrsOn: boolean, { rejectWithValue }) => {
  const effect = safeInvokeEffect('setConfig', { incrementalPrsOn });
  const res = await runEffectThunk(effect, rejectWithValue);
  return get(res, 'config.incrementalPrsOn', incrementalPrsOn) as boolean;
});

export const configSlice = createSlice({
  name: 'config',
  initialState,
  reducers: {
    clearConfigMessages(state) {
      state.error = null;
      state.successMessage = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchConfig.pending, (state, action) => {
        state.loading = true;
        state.currentRequestId = action.meta.requestId;
      })
      .addCase(fetchConfig.fulfilled, (state, action) => {
        if (state.currentRequestId === action.meta.requestId) {
          state.loading = false;
          state.incrementalPrsOn = action.payload;
        }
      })
      .addCase(fetchConfig.rejected, (state, action) => {
        if (state.currentRequestId === action.meta.requestId) {
          state.loading = false;
          state.error = `Failed to fetch config: ${action.payload || 'Unknown error'}`;
        }
      })
      .addCase(updateConfig.pending, (state, action) => {
        state.loading = true;
        state.error = null;
        state.successMessage = null;
        state.currentRequestId = action.meta.requestId;
      })
      .addCase(updateConfig.fulfilled, (state, action) => {
        if (state.currentRequestId === action.meta.requestId) {
          state.loading = false;
          state.incrementalPrsOn = action.payload;
          state.successMessage = 'Configuration saved successfully.';
        }
      })
      .addCase(updateConfig.rejected, (state, action) => {
        if (state.currentRequestId === action.meta.requestId) {
          state.loading = false;
          state.error = `Failed to save config: ${action.payload || 'Unknown error'}`;
        }
      });
  },
});

export const { clearConfigMessages } = configSlice.actions;
export default configSlice.reducer;
