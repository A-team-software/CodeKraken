import { NextRequest } from 'next/server';
import { MongoSiteRepositoryRepository, MongoAtlassianTenantRepository, MongoUserJiraSiteAccessRepository } from '@oliver/db';
import { ListSiteReposUseCase, AssignRepoToSiteUseCase } from '@oliver/application';
import { AssignRepoBodySchema } from '@oliver/domains';
import { SafeExecute } from '@oliver/core/src/errors';
import { ApiRes } from '@/utils/api_response';
import { wrapRoute } from '@/utils/api_handler';

// -----------------------------------------------------------------------
// Singletons (created once per cold-start, reused across requests)
// -----------------------------------------------------------------------
const siteRepoRepository = new MongoSiteRepositoryRepository();
const tenantRepository = new MongoAtlassianTenantRepository();

// -----------------------------------------------------------------------
// Shared guard: ensure the clientKey maps to a known Atlassian tenant or access
// -----------------------------------------------------------------------
async function resolveSite(clientKey: string): Promise<[{ exists: boolean; siteUrl?: string } | null, string | null]> {
    // 1. Check tenant repo (definitive source)
    const [tenant, tenantError] = await SafeExecute.withSync(async () =>
        tenantRepository.findByClientKey(clientKey)
    ).execute();
    if (tenantError) return [null, tenantError.message];
    if (tenant) {
        return [{ exists: true, siteUrl: tenant.baseUrl }, null];
    }

    // 2. Check access repo (fallback)
    const accessRepo = new MongoUserJiraSiteAccessRepository();
    const [access, accessError] = await SafeExecute.withSync(async () =>
        accessRepo.findBySite(clientKey)
    ).execute();
    if (accessError) return [null, accessError.message];
    if (access && access.length > 0) {
        return [{ exists: true, siteUrl: access[0].baseUrl }, null];
    }

    return [{ exists: false }, null];
}

// -----------------------------------------------------------------------
// GET /api/sites/[clientKey]/repositories
// Returns all repositories assigned to this Jira site.
// -----------------------------------------------------------------------
export const GET = wrapRoute(async (request: NextRequest, params: Promise<{ clientKey: string }>) => {
    const [paramsResult, paramsError] = await SafeExecute.withSync(async () => params).execute();
    if (paramsError || !paramsResult) return ApiRes.badRequest(paramsError?.message || 'Invalid params');
    const { clientKey } = paramsResult;

    const [site, siteResolveError] = await resolveSite(clientKey);
    if (siteResolveError || !site) return ApiRes.error(siteResolveError || 'Failed to resolve site');

    if (!site.exists) {
        return ApiRes.notFound('Site not found');
    }

    const [repos, reposError] = await SafeExecute.withSync(async () =>
        new ListSiteReposUseCase(siteRepoRepository).execute(clientKey)
    ).execute();

    if (reposError) return ApiRes.error(reposError.message || 'Failed to list repositories');
    return { repos };
});

// -----------------------------------------------------------------------
// POST /api/sites/[clientKey]/repositories
// Assigns a repository to this Jira site.
// Body: { repoId, repoFullName, provider, htmlUrl }
// -----------------------------------------------------------------------
export const POST = wrapRoute(async (request: NextRequest, params: Promise<{ clientKey: string }>) => {
    const [paramsResult, paramsError] = await SafeExecute.withSync(async () => params).execute();
    if (paramsError || !paramsResult) return ApiRes.badRequest(paramsError?.message || 'Invalid params');
    const { clientKey } = paramsResult;

    const [site, siteResolveError] = await resolveSite(clientKey);
    if (siteResolveError || !site) return ApiRes.error(siteResolveError || 'Failed to resolve site');

    if (!site.exists || !site.siteUrl) {
        return ApiRes.notFound('Site not found');
    }

    const [body, bodyError] = await SafeExecute.withSync(async () => request.json()).execute();
    if (bodyError || !body) return ApiRes.badRequest(bodyError?.message || 'Invalid request body');
    const parsed = AssignRepoBodySchema.safeParse(body);

    if (!parsed.success) {
        return ApiRes.badRequest('Invalid request body', 'INVALID_BODY');
    }

    const [repos, reposError] = await SafeExecute.withSync(async () =>
        new AssignRepoToSiteUseCase(siteRepoRepository).execute({
            clientKey,
            siteUrl: site.siteUrl!,
            ...parsed.data,
        })
    ).execute();

    if (reposError) return ApiRes.error(reposError.message || 'Failed to assign repository');

    return ApiRes.success({ repos }, 201);
});
