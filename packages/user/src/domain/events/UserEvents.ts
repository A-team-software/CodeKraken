import { ConnectedAccount } from '@/lib/git';
import { DomainEvent } from '@/lib/shared/events';

// ─── Event Names (constants) ────────────────────────────────────

export const USER_CREATED = 'user.created' as const;
export const USER_PROFILE_UPDATED = 'user.profile_updated' as const;
export const ACCOUNT_LINKED = 'user.account_linked' as const;
export const ACCOUNT_UNLINKED = 'user.account_unlinked' as const;

// ─── Payload Types ──────────────────────────────────────────────

export interface UserCreatedPayload {
    userId: string;
    email: string;
    name: string;
    role: string;
}

export interface UserProfileUpdatedPayload {
    userId: string;
    changes: {
        name?: string;
        email?: string;
        image?: string;
    };
}

export interface AccountLinkedPayload {
    userId: string;
    account: ConnectedAccount;
}

export interface AccountUnlinkedPayload {
    userId: string;
    provider: string;
    providerAccountId: string;
}

// ─── Event Factories ────────────────────────────────────────────

export function createUserCreatedEvent(payload: UserCreatedPayload): DomainEvent<UserCreatedPayload> {
    return {
        eventName: USER_CREATED,
        occurredAt: new Date(),
        payload,
    };
}

export function createUserProfileUpdatedEvent(payload: UserProfileUpdatedPayload): DomainEvent<UserProfileUpdatedPayload> {
    return {
        eventName: USER_PROFILE_UPDATED,
        occurredAt: new Date(),
        payload,
    };
}

export function createAccountLinkedEvent(payload: AccountLinkedPayload): DomainEvent<AccountLinkedPayload> {
    return {
        eventName: ACCOUNT_LINKED,
        occurredAt: new Date(),
        payload,
    };
}

export function createAccountUnlinkedEvent(payload: AccountUnlinkedPayload): DomainEvent<AccountUnlinkedPayload> {
    return {
        eventName: ACCOUNT_UNLINKED,
        occurredAt: new Date(),
        payload,
    };
}
