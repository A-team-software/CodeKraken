import { Effect, Either } from 'effect';
import { invoke, view } from '@forge/bridge';
import get from 'lodash/get';

/**
 * Safely invokes a Forge bridge command, catching and standardizing any errors.
 * Uses Effect to represent the asynchronous operation and handle failures.
 *
 * @param {string} command - The command to invoke.
 * @param {object} payload - The payload to send.
 * @returns {Effect.Effect<any, string, never>} An Effect that yields the result or fails with a string error.
 */
export const safeInvokeEffect = (command, payload) => {
  return Effect.tryPromise({
    try: () => invoke(command, payload),
    catch: (error) => {
      // Forge often returns errors wrapped in various structures.
      // We use lodash.get to safely extract a meaningful message.
      const status = get(error, 'status');
      const errPayload = get(error, 'payload.error');
      const errMsg = get(error, 'message');
      
      const combinedMsg = errPayload || errMsg || String(error);
      
      if (status === 401) {
        return `Unauthorized (401): ${combinedMsg}`;
      }
      
      return combinedMsg;
    }
  });
};

/**
 * Safely invokes the Forge view API to get the context.
 */
export const safeViewContextEffect = () => {
  return Effect.tryPromise({
    try: () => view.getContext(),
    catch: (error) => {
      const errMsg = get(error, 'message', String(error));
      return `Failed to load context: ${errMsg}`;
    }
  });
};

/**
 * Runs an Effect and integrates it with Redux Toolkit's rejectWithValue.
 *
 * @param {Effect.Effect<any, string, never>} effect - The Effect to run.
 * @param {function} rejectWithValue - RTK's rejectWithValue function.
 * @returns {Promise<any>} The extracted value or rejected payload.
 */
export const runEffectThunk = async (effect, rejectWithValue) => {
  // Convert Effect failure into an Either to avoid throwing exceptions
  const eitherEffect = Effect.either(effect);
  const result = await Effect.runPromise(eitherEffect);
  
  if (Either.isRight(result)) {
    return result.right;
  } else {
    return rejectWithValue(result.left);
  }
};
