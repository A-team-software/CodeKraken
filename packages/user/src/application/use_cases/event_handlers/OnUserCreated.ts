import { DomainEvent } from '@/lib/shared/events';
import { UserCreatedPayload, USER_CREATED } from '@/lib/user/domain/events';

/**
 * Reacts to a new user being created.
 * Placeholder — hook up welcome emails, analytics, default workspace setup, etc.
 */
export function onUserCreated(event: DomainEvent<UserCreatedPayload>): void {
    const { userId, email, name } = event.payload;

    console.log(
        `[${USER_CREATED}] New user created — id=${userId} email=${email} name=${name}`,
    );

    // TODO: send welcome email
    // TODO: emit analytics event
}
