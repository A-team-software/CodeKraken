import { UserJiraSiteAccessRepository } from '@/lib/domains/atlassian/repository/UserJiraSiteAccessRepository.interface';
import { UserJiraSiteAccessAggregate } from '@/lib/domains/atlassian/entities/UserJiraSiteAccess';
import { Logger } from '@/lib/infrastructure/logging/logger';
import { EventBus } from '@/lib/shared/events';
import { ISiteRepositoryRepository, SiteRepositoryAggregate } from '@/lib/domains/site_repository';

export interface StoreUserSiteAccessCommand {
    userId: string;
    clientKey: string;
    baseUrl: string;
    scope: string;
    expiresAt?: Date;
    atlassianAccountId?: string;
    cloudId?: string;
}

/**
 * Use case: Store or update a user's access to a Jira site
 * Called when user completes OAuth with a Jira site
 */
export class StoreUserSiteAccessUseCase {
    constructor(
        private accessRepo: UserJiraSiteAccessRepository,
        private siteRepo: ISiteRepositoryRepository,
        private eventBus: EventBus = EventBus.getInstance()
    ) { }

    async execute(cmd: StoreUserSiteAccessCommand): Promise<UserJiraSiteAccessAggregate> {
        const { userId, clientKey, baseUrl, scope, expiresAt } = cmd;

        try {
            // 1. Create or update the access record (user specific)
            const access = UserJiraSiteAccessAggregate.create({
                userId,
                clientKey,
                baseUrl,
                scope,
                expiresAt,
                atlassianAccountId: cmd.atlassianAccountId,
                cloudId: cmd.cloudId,
            });

            const savedAccess = await this.accessRepo.save(access);

            // 2. Ensure global SiteRepository document exists for this Jira site
            // This collection stores the mapping of repositories assigned to this site
            try {
                let siteRecord = await this.siteRepo.findBySite(clientKey);
                if (!siteRecord) {
                    siteRecord = SiteRepositoryAggregate.create(clientKey, baseUrl);
                    await this.siteRepo.save(siteRecord);
                    Logger.info('Created new SiteRepository for Jira site', { clientKey, siteUrl: baseUrl });
                } else if (siteRecord.siteUrl !== baseUrl) {
                    // Update siteUrl if it changed for some reason
                    const updatedSiteRecord = SiteRepositoryAggregate.fromPersistence({
                        ...siteRecord.toPersistence(),
                        siteUrl: baseUrl
                    });
                    await this.siteRepo.save(updatedSiteRecord);
                    Logger.info('Updated SiteRepository URL', { clientKey, oldUrl: siteRecord.siteUrl, newUrl: baseUrl });
                }
            } catch (siteRepoError) {
                // Log but don't fail the whole operation if site repository update fails
                Logger.error('Failed to update SiteRepository during site access storage', { clientKey, error: siteRepoError });
            }

            Logger.info('User site access stored', {
                userId,
                clientKey,
                scope,
                expiresAt: expiresAt?.toISOString()
            });

            // Publish domain event if event bus is available
            // This can trigger downstream processes like logging or notifications
            if (this.eventBus && savedAccess) {
                // Optionally emit event for audit logging
                // this.eventBus.publish(new UserSiteAccessGrantedEvent(...));
            }

            return savedAccess;
        } catch (error) {
            Logger.error('Failed to store user site access', { userId, clientKey, error });
            throw error;
        }
    }
}
