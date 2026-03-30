/**
 * Base interface for all domain events.
 * Every event carries a name, a timestamp, and a typed payload.
 */
export interface DomainEvent<T = unknown> {
    readonly eventName: string;
    readonly occurredAt: Date;
    readonly payload: T;
}

/**
 * Abstract base that all aggregate roots extend.
 * Provides helpers to record and flush domain events.
 */
export abstract class AggregateRoot {
    private _domainEvents: DomainEvent[] = [];

    /** Enqueue an event to be published after the aggregate is persisted. */
    protected addDomainEvent(event: DomainEvent): void {
        this._domainEvents.push(event);
    }

    /** Return a copy of the pending events. */
    get domainEvents(): ReadonlyArray<DomainEvent> {
        return [...this._domainEvents];
    }

    /** Clear events after they have been dispatched. */
    clearDomainEvents(): void {
        this._domainEvents = [];
    }
}
