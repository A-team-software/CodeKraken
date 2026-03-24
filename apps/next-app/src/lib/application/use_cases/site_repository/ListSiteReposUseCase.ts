import { ISiteRepositoryRepository, AssignedRepo } from '@/lib/domains/site_repository';

export class ListSiteReposUseCase {
    constructor(private readonly siteRepoRepository: ISiteRepositoryRepository) { }

    /**
     * Returns all repositories assigned to this Jira site.
     * Returns an empty array if no repos have been assigned.
     */
    async execute(clientKey: string): Promise<ReadonlyArray<AssignedRepo>> {
        const siteRepo = await this.siteRepoRepository.findBySite(clientKey);

        if (!siteRepo) {
            return [];
        }

        return siteRepo.repos;
    }
}
