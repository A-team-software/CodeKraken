import { DomainEvent } from '@/lib/shared/events';
import { AccountLinkedPayload, ACCOUNT_LINKED } from '@/lib/user/domain/events';

/**
 * Reacts to a git account being linked to a user.
 * Placeholder — hook up repository sync, token refresh scheduling, etc.
 */
export function onAccountLinked(event: DomainEvent<AccountLinkedPayload>): void {
    const { userId, account } = event.payload;

    console.log(
        `[${ACCOUNT_LINKED}] Account linked — userId=${userId} provider=${account.provider} providerAccountId=${account.providerAccountId}`,
    );

    // TODO: trigger initial repository sync
    // TODO: schedule token refresh if expiresAt is set
}
