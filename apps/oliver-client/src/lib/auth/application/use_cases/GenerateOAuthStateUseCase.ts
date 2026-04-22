import { OAuthStateRepository } from "../../domain";
import { Buffer } from "buffer";

export class GenerateOAuthStateUseCase {
    constructor(private stateRepo: OAuthStateRepository) { }

    async execute(provider: string, metadata?: string): Promise<string> {
        const state = this.generateRandomString(32);
        await this.stateRepo.create(state, provider, metadata);
        return state;
    }

    private generateRandomString(length: number): string {
        const randomBytes = Buffer.alloc(length);
        for (let i = 0; i < randomBytes.length; i++) {
            randomBytes[i] = Math.floor(Math.random() * 256);
        }
        return randomBytes.toString('hex');
    }
}
