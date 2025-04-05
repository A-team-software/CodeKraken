export default interface SafeExecuteInterface {
    /**
 * Safely executes an asynchronous function with the provided arguments.
 * Avoids the need for a try-catch block at the call site.
 * Returns a tuple: [result, null] on success, [null, Error] on failure.
 *
 * @template T The expected return type of the successful promise resolution.
 * @template A A tuple type representing the arguments expected by the function `fn`.
 * @param fn The asynchronous function (or function returning a Promise) to execute.
 * @param args The arguments to pass to the function `fn`.
 * @returns A Promise resolving to a tuple `[T | null, Error | null]`.
 */
    withSync<T, A extends unknown[]>(fn: (...args: A) => Promise<T>, ...args: A): Promise<[T | null, Error | null]>
    /**
* Safely executes an asynchronous function with the provided arguments.
* Avoids the need for a try-catch block at the call site.
* Returns a tuple: [result, null] on success, [null, Error] on failure.
*
* @template T The expected return type of the successful promise resolution.
* @template A A tuple type representing the arguments expected by the function `fn`.
* @param fn The asynchronous function (or function returning a Promise) to execute.
* @param args The arguments to pass to the function `fn`.
* @returns A tuple `[T | null, Error | null]`.
*/
    noSync<T, A extends unknown[]>(fn: (...args: A) => T, ...args: A): [T | null, Error | null]


    /**
 * Safely executes an asynchronous function with the provided arguments.
 * Avoids the need for a try-catch block at the call site.
 * Returns a tuple: [result, null] on success, [null, Error] on failure.
 *
 * @template T The expected return type of the successful promise resolution.
 * @template A A tuple type representing the arguments expected by the function `fn`.
 * @param fn The asynchronous function (or function returning a Promise) to execute.
 * @param args The arguments to pass to the function `fn`.
 * @returns A Promise resolving to a tuple `[T | Promise<T> | null, Error | null]`.
 */
    withAsyncAsNoneBlocking<T, A extends unknown[]>(fn: (...args: A) => Promise<T>, ...args: A): [T | Promise<T> | null, Error | null]
}
