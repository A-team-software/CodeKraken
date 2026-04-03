import { GitProvider, UserProps } from "@oliver/core";
import { UserAggregate } from "../aggregates/user_aggregate";

export interface UserRepository {
    nextIdentity(): string;
    findById(id: string): Promise<UserAggregate | null>;
    findByEmail(email: string): Promise<UserAggregate | null>;
    findByUsername(username: string): Promise<UserAggregate | null>;
    findBy(filters: Partial<UserProps>): Promise<UserAggregate[]>;
    findByGitId(provider: GitProvider, providerId: string): Promise<UserAggregate | null>;
    save(user: UserAggregate): Promise<UserAggregate>;
}
