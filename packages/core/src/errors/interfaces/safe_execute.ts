export interface SafeExecuteBuilder<T, E> {
    /**
     * Retries the operation if it fails.
     */
    withRetry(options?: { attempts?: number; delayMs?: number }): this;

    /**
     * Fails the operation if it does not complete within the given milliseconds.
     */
    withTimeout(ms: number): this;

    /**
     * Catches and maps any errors that occur.
     */
    withMapError<E2>(mapper: (rawErr: E) => E2): SafeExecuteBuilder<T, E2>;

    /**
     * Executes the pipeline and returns a tuple `[Result | null, Error | null]`.
     */
    execute(): Promise<[T | null, E | null]>;
}

export default interface SafeExecuteInterface {
    /**
     * Safely executes an asynchronous function with the provided arguments.
     * Avoids the need for a try-catch block at the call site.
     *
     * @template T The expected return type of the successful promise resolution.
     * @template A A tuple type representing the arguments expected by the function `fn`.
     * @param fn The asynchronous function (or function returning a Promise) to execute.
     * @param args The arguments to pass to the function `fn`.
     * @returns A chainable builder `SafeExecuteBuilder`.
     */
    withSync<T, A extends unknown[]>(fn: (...args: A) => Promise<T>, ...args: A): SafeExecuteBuilder<T, Error>;
}
