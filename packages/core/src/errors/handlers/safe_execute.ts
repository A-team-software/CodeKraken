import { Effect } from "effect";
import { flow } from "lodash";
import { Logger } from "@/src/observability";
import SafeExecuteInterface, { SafeExecuteBuilder as IBuilder } from "../interfaces/safe_execute";
import { applyRetry, applyTimeout, applyCatch, SafeRetryOptions } from "../effects/pipeline_steps";

class SafeExecuteBuilder<T, E> implements IBuilder<T, E> {
    private steps: Array<(eff: Effect.Effect<any, any, any>) => Effect.Effect<any, any, any>> = [];

    constructor(private baseEffect: Effect.Effect<T, E, never>) {}

    withRetry(options?: SafeRetryOptions): this {
        this.steps.push(applyRetry(options));
        return this;
    }

    withTimeout(ms: number): this {
        this.steps.push(applyTimeout(ms));
        return this;
    }

    withMapError<E2>(mapper: (rawErr: E) => E2): SafeExecuteBuilder<T, E2> {
        this.steps.push(applyCatch(mapper) as any);
        return this as unknown as SafeExecuteBuilder<T, E2>;
    }

    async execute(): Promise<[T | null, E | null]> {
        // Assemble pipeline using lodash flow
        const effectPipeline = this.steps.length > 0 
            ? flow(this.steps as any)(this.baseEffect) as Effect.Effect<T, E, never>
            : this.baseEffect;

        // Transform into a tuple [Result, null] or [null, Error]
        const runnable = Effect.match(effectPipeline, {
            onFailure: (error) => {
                Logger.error("[Error]: ", error);
                return [null, error] as [null, E];
            },
            onSuccess: (result) => [result, null] as [T, null]
        });

        return Effect.runPromise(runnable);
    }
}

function withSync<T, A extends unknown[]>(
    fn: (...args: A) => Promise<T>,
    ...args: A
): IBuilder<T, Error> {
    const baseEffect = Effect.tryPromise({
        try: () => fn(...args),
        catch: (error) => (error instanceof Error ? error : new Error(String(error)))
    });
    return new SafeExecuteBuilder(baseEffect);
}

export const SafeExecute: SafeExecuteInterface = {
    withSync,
} as const;
