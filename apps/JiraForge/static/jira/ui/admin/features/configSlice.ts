import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import get from 'lodash/get';
import { safeInvokeEffect, runEffectThunk } from '../utils/effectAsync';

export interface ConfigState {
  incrementalPrsOn: boolean;
  loading: boolean;
  error: string | null;
  successMessage: string | null;
}

const initialState: ConfigState = {
  incrementalPrsOn: false,
  loading: false,
  error: null,
  successMessage: null,
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
      .addCase(fetchConfig.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchConfig.fulfilled, (state, action) => {
        state.loading = false;
        state.incrementalPrsOn = action.payload;
      })
      .addCase(fetchConfig.rejected, (state, action) => {
        state.loading = false;
        state.error = `Failed to fetch config: ${action.payload}`;
      })
      .addCase(updateConfig.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(updateConfig.fulfilled, (state, action) => {
        state.loading = false;
        state.incrementalPrsOn = action.payload;
        state.successMessage = 'Configuration saved successfully.';
      })
      .addCase(updateConfig.rejected, (state, action) => {
        state.loading = false;
        state.error = `Failed to save config: ${action.payload}`;
      });
  },
});

export const { clearConfigMessages } = configSlice.actions;
export default configSlice.reducer;
