import SafeExecuteInterface from "../interfaces/safe_execute";
import { Logger } from "../logger/logger";


async function withAsync<T, A extends unknown[]>(
    fn: (...args: A) => Promise<T>, // fn takes arguments described by tuple A, returns Promise<T>
    ...args: A                      // The actual arguments matching the tuple type A
): Promise<[T | null, Error | null]> {
    try {
        // Use spread syntax to pass the collected arguments to fn
        const result = await fn(...args);
        return [result, null]; // Success: return result, null error
    } catch (error) {
        // Failure: return null result, Error instance
        const failure = [null, error instanceof Error ? error : new Error(String(error))];
        Logger.logError(failure);
        return failure as [T | null, Error | null];
    }
}


function noSync<T, A extends unknown[]>(
    fn: (...args: A) => T, // fn takes arguments described by tuple A, returns Promise<T>
    ...args: A                      // The actual arguments matching the tuple type A
): [T | null, Error | null] {
    try {
        // Use spread syntax to pass the collected arguments to fn
        const result = fn(...args);
        return [result, null]; // Success: return result, null error
    } catch (error) {
        const failure = [null, error instanceof Error ? error : new Error(String(error))];
        Logger.logError(failure);
        // Failure: return null result, Error instance
        return failure as [T | null, Error | null];
    }
}




export const SafeExecute: SafeExecuteInterface = {
    withSync: withAsync,
    noSync: noSync,
} as const;
