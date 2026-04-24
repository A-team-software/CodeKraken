import { MongoPersonalAccessTokenRepository } from '../infrastructure/repositories/PersonalAccessTokenRepository.mongo';
import { PersonalAccessTokenAggregate } from '../domain/entities/personal_access_token_entity';
import crypto from 'crypto';

export class PersonalAccessTokenService {
    private static instance: PersonalAccessTokenService;
    private tokenRepo = new MongoPersonalAccessTokenRepository();

    private constructor() {}

    public static getInstance(): PersonalAccessTokenService {
        if (!PersonalAccessTokenService.instance) {
            PersonalAccessTokenService.instance = new PersonalAccessTokenService();
        }
        return PersonalAccessTokenService.instance;
    }

    async generateToken(userId: string, name: string): Promise<{ rawToken: string; aggregate: PersonalAccessTokenAggregate }> {
        const rawToken = `sca_${crypto.randomBytes(32).toString('hex')}`;
        
        const tokenAggregate = PersonalAccessTokenAggregate.create({
            userId,
            name,
            token: rawToken,
        });

        const saved = await this.tokenRepo.save(tokenAggregate);
        return { rawToken, aggregate: saved };
    }

    async validateToken(token: string): Promise<PersonalAccessTokenAggregate | null> {
        const aggregate = await this.tokenRepo.findByToken(token);
        if (!aggregate) return null;

        aggregate.updateLastUsed();
        await this.tokenRepo.save(aggregate);

        return aggregate;
    }

    async getTokensByUser(userId: string): Promise<PersonalAccessTokenAggregate[]> {
        return await this.tokenRepo.findByUser(userId);
    }

    async revokeToken(tokenId: string): Promise<void> {
        await this.tokenRepo.delete(tokenId);
    }
}
