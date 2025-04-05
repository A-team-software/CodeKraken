import { peek } from "bun";
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
        return [null, error instanceof Error ? error : new Error(String(error))];
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
        // Failure: return null result, Error instance
        return [null, error instanceof Error ? error : new Error(String(error))];
    }
}


function withPromiseAsNoneBlocking<T, A extends unknown[]>(
    fn: (...args: A) => Promise<T>, // fn takes arguments described by tuple A, returns Promise<T>
    ...args: A                      // The actual arguments matching the tuple type A
): [T | Promise<T> | null, Error | null] {
    try {
        // Use spread syntax to pass the collected arguments to fn
        const result = fn(...args);
        const promiseStatus = peek.status(result)

        if (promiseStatus === "pending") {
            Logger.logInfo("Promise is pending");
        }

        if (promiseStatus === "rejected") {
            Logger.logInfo("The promise was rejected");
        }
        if (promiseStatus === "fulfilled") {
            Logger.logInfo("Connected to db");
        }

        const resolve = peek(result);
        return [resolve, null];
    } catch (error) {
        // Failure: return null result, Error instance
        return [null, error instanceof Error ? error : new Error(String(error))];
    }
}


export const SafeExecute: SafeExecuteInterface = {
    withSync: withAsync,
    noSync: noSync,
    withPromiseAsNoneBlocking: withPromiseAsNoneBlocking,
} as const;
