import { ISiteRepositoryRepository, SiteRepositoryAggregate, AssignedRepo } from '@oliver/domains';

export interface AssignRepoInput {
    clientKey: string;
    siteUrl: string;
    repoId: string;
    repoFullName: string;
    provider: 'github' | 'bitbucket';
    htmlUrl: string;
}

export class AssignRepoToSiteUseCase {
    constructor(private readonly siteRepoRepository: ISiteRepositoryRepository) { }

    async execute(input: AssignRepoInput): Promise<ReadonlyArray<AssignedRepo>> {
        // Load existing aggregate or create a new one for this site
        let siteRepo = await this.siteRepoRepository.findBySite(input.clientKey);

        if (!siteRepo) {
            siteRepo = SiteRepositoryAggregate.create(input.clientKey, input.siteUrl);
        }

        // Domain enforces dedup — safe to call unconditionally
        siteRepo.assignRepo({
            repoId: input.repoId,
            repoFullName: input.repoFullName,
            provider: input.provider,
            htmlUrl: input.htmlUrl,
        });

        await this.siteRepoRepository.save(siteRepo);

        return siteRepo.repos;
    }
}
