import { ISiteRepositoryRepository, GitProvider, AssignedRepo } from '@/lib/domains/site_repository';

export interface RemoveRepoInput {
    clientKey: string;
    repoId: string;
    provider: GitProvider;
}

export class RemoveRepoFromSiteUseCase {
    constructor(private readonly siteRepoRepository: ISiteRepositoryRepository) { }

    /**
     * Removes a repository from the site's assigned list.
     * Returns false if the repo was not found (idempotent — not an error).
     */
    async execute(input: RemoveRepoInput): Promise<{ removed: boolean; repos: ReadonlyArray<AssignedRepo> }> {
        const siteRepo = await this.siteRepoRepository.findBySite(input.clientKey);

        if (!siteRepo) {
            return { removed: false, repos: [] };
        }

        const removed = siteRepo.removeRepo(input.repoId, input.provider);

        if (removed) {
            await this.siteRepoRepository.save(siteRepo);
        }

        return { removed, repos: siteRepo.repos };
    }
}
