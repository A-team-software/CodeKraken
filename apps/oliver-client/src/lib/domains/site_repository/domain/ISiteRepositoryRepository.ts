import { SiteRepositoryAggregate } from './SiteRepository.entity';

/**
 * Repository port for the site_repository bounded context.
 *
 * Implementations live in the infrastructure layer.
 * The domain owns this interface — dependencies point inward.
 */
export interface ISiteRepositoryRepository {
    /**
     * Retrieve the aggregate for a Jira site.
     * Returns null if no repos have been assigned yet.
     */
    findBySite(clientKey: string): Promise<SiteRepositoryAggregate | null>;

    /**
     * Retrieve the aggregate using the site's URL.
     * Used by the Forge app to check if the site is connected.
     */
    findBySiteUrl(siteUrl: string): Promise<SiteRepositoryAggregate | null>;

    /**
     * Persist the aggregate (create or replace).
     */
    save(siteRepository: SiteRepositoryAggregate): Promise<void>;
}
