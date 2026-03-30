import { UserJiraSiteAccessRepository } from '@/lib/domains/atlassian/repository/UserJiraSiteAccessRepository.interface';
import { UserJiraSiteAccessAggregate } from '@/lib/domains/atlassian/entities/UserJiraSiteAccess';
import { Logger } from '@/lib/infrastructure/logging/logger';

export interface GetUserJiraSitesCommand {
    userId: string;
}

/**
 * Use case: Get all Jira sites a user has access to
 * Returns access records with permission scopes and expiry info
 */
export class GetUserJiraSitesUseCase {
    constructor(private accessRepo: UserJiraSiteAccessRepository) { }

    async execute(cmd: GetUserJiraSitesCommand): Promise<UserJiraSiteAccessAggregate[]> {
        const { userId } = cmd;

        try {
            const accesses = await this.accessRepo.findByUser(userId);

            // Filter out expired accesses
            const validAccesses = accesses.filter(access => access.isValid());

            Logger.info(`Found ${validAccesses.length} valid Jira sites for user`, { userId });

            return validAccesses;
        } catch (error) {
            Logger.error('Failed to get user Jira sites', { userId, error });
            throw error;
        }
    }
}
