import SafeExecuteInterface from "../interfaces/safe_execute";


async function safeExecute<T, A extends unknown[]>(
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


function safeExecuteNoSync<T, A extends unknown[]>(
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


const SafeExecute: SafeExecuteInterface = {
    safeExecute: safeExecute,
    safeExecuteNoSync: safeExecuteNoSync,
} as const;

export default SafeExecute;
