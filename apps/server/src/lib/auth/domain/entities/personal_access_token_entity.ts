import { z } from 'zod';
import { AggregateRoot } from '@/lib/shared/events';

export const PersonalAccessTokenZodSchema = z.object({
    id: z.string().nullish().transform(v => v ?? undefined),
    userId: z.string(),
    name: z.string(),
    token: z.string(),
    lastUsedAt: z.date().nullish().transform(v => v ?? undefined),
    createdAt: z.date().nullish().transform(v => v ?? undefined),
    updatedAt: z.date().nullish().transform(v => v ?? undefined),
});

export type PersonalAccessTokenProps = z.infer<typeof PersonalAccessTokenZodSchema>;

export class PersonalAccessTokenAggregate extends AggregateRoot {
    private props: PersonalAccessTokenProps;

    private constructor(props: PersonalAccessTokenProps) {
        super();
        this.props = props;
    }

    static create(props: Omit<PersonalAccessTokenProps, 'id' | 'createdAt' | 'updatedAt' | 'lastUsedAt'>, id?: string): PersonalAccessTokenAggregate {
        const now = new Date();
        const validated = PersonalAccessTokenZodSchema.parse({
            ...props,
            id,
            createdAt: now,
            updatedAt: now,
        });

        return new PersonalAccessTokenAggregate(validated);
    }

    static fromPersistence(props: PersonalAccessTokenProps): PersonalAccessTokenAggregate {
        const validated = PersonalAccessTokenZodSchema.parse(props);
        return new PersonalAccessTokenAggregate(validated);
    }

    get id(): string | undefined { return this.props.id; }
    get userId(): string { return this.props.userId; }
    get name(): string { return this.props.name; }
    get token(): string { return this.props.token; }
    get lastUsedAt(): Date | undefined { return this.props.lastUsedAt; }
    get createdAt(): Date | undefined { return this.props.createdAt; }

    updateLastUsed(): void {
        this.props.lastUsedAt = new Date();
        this.props.updatedAt = new Date();
    }

    toPersistence(): PersonalAccessTokenProps {
        return { ...this.props };
    }
}
