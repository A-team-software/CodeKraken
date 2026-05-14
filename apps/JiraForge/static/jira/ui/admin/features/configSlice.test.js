import { describe, it, expect, vi, beforeEach } from 'vitest';
import configReducer, { fetchConfig, updateConfig, clearConfigMessages } from './configSlice';

// Mock the effectAsync utils
vi.mock('../utils/effectAsync', () => ({
  safeInvokeEffect: vi.fn(),
  runEffectThunk: vi.fn(),
}));

import { safeInvokeEffect, runEffectThunk } from '../utils/effectAsync';

describe('configSlice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const initialState = {
    incrementalPrsOn: false,
    loading: false,
    error: null,
    successMessage: null,
  };

  it('should return the initial state', () => {
    expect(configReducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  it('should handle clearConfigMessages', () => {
    const state = {
      ...initialState,
      error: 'some error',
      successMessage: 'success!',
    };
    expect(configReducer(state, clearConfigMessages())).toEqual(initialState);
  });

  describe('fetchConfig', () => {
    it('sets loading true on pending', () => {
      const action = { type: fetchConfig.pending.type };
      const state = configReducer(initialState, action);
      expect(state.loading).toBe(true);
    });

    it('sets incrementalPrsOn on fulfilled', () => {
      const action = { type: fetchConfig.fulfilled.type, payload: true };
      const state = configReducer({ ...initialState, loading: true }, action);
      expect(state.loading).toBe(false);
      expect(state.incrementalPrsOn).toBe(true);
    });

    it('sets error on rejected', () => {
      const action = { type: fetchConfig.rejected.type, payload: 'API failed' };
      const state = configReducer({ ...initialState, loading: true }, action);
      expect(state.loading).toBe(false);
      expect(state.error).toBe('Failed to fetch config: API failed');
    });
  });

  describe('updateConfig', () => {
    it('sets loading true and clears messages on pending', () => {
      const stateWithErrors = { ...initialState, error: 'err', successMessage: 'succ' };
      const action = { type: updateConfig.pending.type };
      const state = configReducer(stateWithErrors, action);
      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
      expect(state.successMessage).toBeNull();
    });

    it('sets incrementalPrsOn and success message on fulfilled', () => {
      const action = { type: updateConfig.fulfilled.type, payload: true };
      const state = configReducer({ ...initialState, loading: true }, action);
      expect(state.loading).toBe(false);
      expect(state.incrementalPrsOn).toBe(true);
      expect(state.successMessage).toBe('Configuration saved successfully.');
    });

    it('sets error on rejected', () => {
      const action = { type: updateConfig.rejected.type, payload: 'Server error' };
      const state = configReducer({ ...initialState, loading: true }, action);
      expect(state.loading).toBe(false);
      expect(state.error).toBe('Failed to save config: Server error');
    });
  });
});
