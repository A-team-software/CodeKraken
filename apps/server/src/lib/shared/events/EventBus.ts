import { DomainEvent } from './DomainEvent';

export type EventHandler<T = unknown> = (event: DomainEvent<T>) => void | Promise<void>;

/**
 * Lightweight in-process event bus.
 * Handlers are invoked asynchronously but failures are caught and logged
 * so they never break the primary flow.
 */
export class EventBus {
    private static instance: EventBus;
    private handlers = new Map<string, EventHandler[]>();

    private constructor() {}

    static getInstance(): EventBus {
        if (!EventBus.instance) {
            EventBus.instance = new EventBus();
        }
        return EventBus.instance;
    }

    /** Register a handler for a specific event name. */
    subscribe<T = unknown>(eventName: string, handler: EventHandler<T>): void {
        const existing = this.handlers.get(eventName) ?? [];
        existing.push(handler as EventHandler);
        this.handlers.set(eventName, existing);
    }

    /** Publish an event — all registered handlers are invoked. */
    async publish(event: DomainEvent): Promise<void> {
        const handlers = this.handlers.get(event.eventName) ?? [];

        await Promise.allSettled(
            handlers.map(async (handler) => {
                try {
                    await handler(event);
                } catch (error) {
                    console.error(
                        `[EventBus] Handler failed for "${event.eventName}":`,
                        error,
                    );
                }
            }),
        );
    }

    /** Publish all pending events from an aggregate and then clear them. */
    async publishAll(events: ReadonlyArray<DomainEvent>): Promise<void> {
        for (const event of events) {
            await this.publish(event);
        }
    }

    /** Remove all handlers (useful for testing). */
    clearHandlers(): void {
        this.handlers.clear();
    }
}
