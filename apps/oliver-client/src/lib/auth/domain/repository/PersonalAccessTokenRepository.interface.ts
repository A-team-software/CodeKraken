import { PersonalAccessTokenAggregate } from "../entities/personal_access_token_entity";

export interface PersonalAccessTokenRepository {
    save(token: PersonalAccessTokenAggregate): Promise<PersonalAccessTokenAggregate>;
    findById(id: string): Promise<PersonalAccessTokenAggregate | null>;
    findByToken(token: string): Promise<PersonalAccessTokenAggregate | null>;
    findByUser(userId: string): Promise<PersonalAccessTokenAggregate[]>;
    delete(id: string): Promise<void>;
}
