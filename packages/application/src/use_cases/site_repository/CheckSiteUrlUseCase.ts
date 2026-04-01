import { ISiteRepositoryRepository } from '@oliver/domains';

export interface CheckSiteUrlUseCaseRequest {
    siteUrl: string;
}

export interface CheckSiteUrlUseCaseResponse {
    connected: boolean;
}

export class CheckSiteUrlUseCase {
    constructor(
        private readonly siteRepositoryRepo: ISiteRepositoryRepository
    ) { }

    async execute(request: CheckSiteUrlUseCaseRequest): Promise<CheckSiteUrlUseCaseResponse> {
        if (!request.siteUrl) {
            throw new Error('siteUrl is required');
        }

        const siteRepo = await this.siteRepositoryRepo.findBySiteUrl(request.siteUrl);

        return {
            connected: siteRepo !== null,
        };
    }
}
