import { EventBus } from '@/lib/shared/events';
import { USER_CREATED, ACCOUNT_LINKED } from '../../../domain/events/UserEvents';
import { onUserCreated } from './OnUserCreated';
import { onAccountLinked } from './OnAccountLinked';

let isRegistered = false;

/**
 * Registers all application event handlers with the EventBus.
 * This should be called once at application startup.
 */
export function registerHandlers(): void {
    if (isRegistered) return;

    const eventBus = EventBus.getInstance();

    // User Domain Handlers
    eventBus.subscribe(USER_CREATED, onUserCreated);
    eventBus.subscribe(ACCOUNT_LINKED, onAccountLinked);

    isRegistered = true;
    console.log('[EventHandlers] Registered all domain event handlers.');
}
