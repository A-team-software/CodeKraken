import { UserProps, UserZodSchema } from "../entity/user_entity";
import { AggregateRoot } from "@/lib/shared/events";
import { createAccountLinkedEvent, createAccountUnlinkedEvent, createUserCreatedEvent, createUserProfileUpdatedEvent } from "../events/UserEvents";
import { ConnectedAccount } from "@/lib/git";

export class UserAggregate extends AggregateRoot {
    private props: UserProps;

    private constructor(props: UserProps) {
        super();
        this.props = props;
    }

    // ── Static Factories ────────────────────────────────────────

    /** Create a brand-new user and raise a UserCreatedEvent. */
    static create(
        props: Omit<UserProps, 'id' | 'accounts' | 'createdAt' | 'updatedAt' | 'settings' | 'onboardingStep'> & { settings?: UserProps['settings'], onboardingStep?: UserProps['onboardingStep'] },
        id?: string
    ): UserAggregate {
        const now = new Date();
        const validated = UserZodSchema.parse({
            ...props,
            id,
            accounts: [],
            onboardingStep: 'connect',
            createdAt: now,
            updatedAt: now,
        });

        const aggregate = new UserAggregate(validated);

        aggregate.addDomainEvent(
            createUserCreatedEvent({
                userId: validated.id ?? '',
                email: validated.email,
                name: validated.name,
                role: validated.role,
            }),
        );

        return aggregate;
    }

    /** Reconstitute from persistence (no events raised). */
    static fromPersistence(props: UserProps): UserAggregate {
        const validated = UserZodSchema.parse(props);
        return new UserAggregate(validated);
    }

    // ── Getters ─────────────────────────────────────────────────

    get id(): string | undefined { return this.props.id; }
    get name(): string { return this.props.name; }
    get email(): string { return this.props.email; }
    get image(): string | undefined { return this.props.image; }
    get role(): string { return this.props.role; }
    get accounts(): ReadonlyArray<ConnectedAccount> { return this.props.accounts; }
    get username(): string | undefined { return this.props.username; }
    get avatarUrl(): string | undefined { return this.props.avatarUrl; }
    get url(): string | undefined { return this.props.url; }
    get createdAt(): Date | undefined { return this.props.createdAt; }
    get updatedAt(): Date | undefined { return this.props.updatedAt; }
    get onboardingStep() { return this.props.onboardingStep; }
    get settings() { return this.props.settings; }

    // ── Commands ─────────────────────────────────────────────────

    updateProfile(changes: {
        name?: string;
        email?: string;
        image?: string;
        username?: string;
        avatarUrl?: string;
        url?: string;
    }): void {
        if (changes.name) this.props.name = changes.name;
        if (changes.email) this.props.email = changes.email;
        if (changes.image) this.props.image = changes.image;
        if (changes.username) this.props.username = changes.username;
        if (changes.avatarUrl) this.props.avatarUrl = changes.avatarUrl;
        if (changes.url) this.props.url = changes.url;
        this.props.updatedAt = new Date();

        this.addDomainEvent(
            createUserProfileUpdatedEvent({
                userId: this.props.id ?? '',
                changes,
            }),
        );
    }

    linkAccount(account: ConnectedAccount): void {
        const exists = this.props.accounts.some(
            (a) => a.provider === account.provider && a.providerAccountId === account.providerAccountId,
        );

        if (exists) {
            throw new Error(
                `Account ${account.provider}/${account.providerAccountId} is already linked.`,
            );
        }

        this.props.accounts = [...this.props.accounts, account];
        this.props.updatedAt = new Date();

        this.addDomainEvent(
            createAccountLinkedEvent({
                userId: this.props.id ?? '',
                account,
            }),
        );
    }

    linkOrUpdateAccount(account: ConnectedAccount): void {
        const index = this.props.accounts.findIndex(
            (a) => a.provider === account.provider && a.providerAccountId === account.providerAccountId,
        );

        if (index !== -1) {
            // Update existing account
            const updatedAccounts = [...this.props.accounts];
            updatedAccounts[index] = {
                ...updatedAccounts[index],
                ...account,
            };
            this.props.accounts = updatedAccounts;
        } else {
            // Link new account
            this.props.accounts = [...this.props.accounts, account];
        }

        this.props.updatedAt = new Date();

        // Note: We might want a specific event for updates, but linkAccount event usually suffices 
        // if the consumer just wants to know "this account is now associated/refreshed".
        this.addDomainEvent(
            createAccountLinkedEvent({
                userId: this.props.id ?? '',
                account,
            }),
        );
    }

    unlinkAccount(provider: string, providerAccountId: string): void {
        const before = this.props.accounts.length;

        this.props.accounts = this.props.accounts.filter(
            (a) => !(a.provider === provider && a.providerAccountId === providerAccountId),
        );

        if (this.props.accounts.length === before) {
            throw new Error(
                `Account ${provider}/${providerAccountId} not found.`,
            );
        }

        this.props.updatedAt = new Date();

        this.addDomainEvent(
            createAccountUnlinkedEvent({
                userId: this.props.id ?? '',
                provider,
                providerAccountId,
            }),
        );
    }

    updateSettings(settings: Partial<UserProps['settings']>): void {
        this.props.settings = {
            ...this.props.settings,
            ...settings,
            opencode: {
                ...this.props.settings.opencode,
                ...(settings.opencode || {}),
            }
        };
        this.props.updatedAt = new Date();
    }

    updateOpencodeModel(model: string): void {
        this.props.settings.opencode.model = model;
        this.props.updatedAt = new Date();
    }

    updateGroqApiKey(apiKey: string): void {
        this.props.settings.opencode.groqApiKey = apiKey;
        this.props.updatedAt = new Date();
    }

    updateOnboardingStep(step: UserProps['onboardingStep']): void {
        this.props.onboardingStep = step;
        this.props.updatedAt = new Date();
    }

    // ── Serialisation ───────────────────────────────────────────

    /** Return a plain object suitable for persistence. */
    toPersistence(): UserProps {
        return { ...this.props };
    }
}
