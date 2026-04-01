import { Effect, Schedule } from "effect";

export interface SafeRetryOptions {
    attempts?: number;
    delayMs?: number;
}

/**
 * Creates a pipeline step that applies a retry schedule to an Effect.
 */
export const applyRetry = (options?: SafeRetryOptions) => {
    return <A, E, R>(effect: Effect.Effect<A, E, R>) => {
        if (!options) return effect;
        const attempts = options.attempts ?? 3;
        const delayMs = options.delayMs ?? 100;
        
        let schedule = Schedule.recurs(attempts);
        if (delayMs > 0) {
            schedule = Schedule.addDelay(schedule, () => `${delayMs} millis`);
        }
        
        return Effect.retry(effect, schedule);
    };
};

/**
 * Creates a pipeline step that applies a timeout to an Effect.
 */
export const applyTimeout = (ms: number) => {
    return <A, E, R>(effect: Effect.Effect<A, E, R>) => {
        if (ms <= 0) return effect;
        return Effect.timeout(effect, `${ms} millis`);
    };
};

/**
 * Creates a pipeline step that maps any errors from previous steps.
 */
export const applyCatch = <E, E2>(mapper: (rawErr: E) => E2) => {
    return <A, R>(effect: Effect.Effect<A, E, R>) => {
        return Effect.catchAll(effect, (err) => Effect.fail(mapper(err)));
    };
};
