import { NextRequest, NextResponse } from 'next/server';
import { MongoSiteRepositoryRepository } from '@oliver/db';
import { MongoAtlassianTenantRepository } from '@oliver/db';
import { MongoUserJiraSiteAccessRepository } from '@oliver/db';
import { ListSiteReposUseCase } from '@oliver/application';
import { AssignRepoToSiteUseCase } from '@oliver/application';
import { AssignRepoBodySchema } from '@oliver/domains';
import { SafeExecute } from '@oliver/core/src/errors';

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
export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ clientKey: string }> }
) {
    try {
        const [paramsResult, paramsError] = await SafeExecute.withSync(async () => params).execute();
        if (paramsError || !paramsResult) return NextResponse.json({ error: paramsError?.message || 'Invalid params' }, { status: 400 });
        const { clientKey } = paramsResult;

        const [site, siteResolveError] = await resolveSite(clientKey);
        if (siteResolveError || !site) return NextResponse.json({ error: siteResolveError || 'Failed to resolve site' }, { status: 500 });

        if (!site.exists) {
            return NextResponse.json({ error: 'Site not found' }, { status: 404 });
        }

        const [repos, reposError] = await SafeExecute.withSync(async () =>
            new ListSiteReposUseCase(siteRepoRepository).execute(clientKey)
        ).execute();

        if (reposError) return NextResponse.json({ error: reposError.message || 'Failed to list repositories' }, { status: 500 });
        return NextResponse.json({ repos });
    } catch (error: any) {
        console.error('[GET /api/sites/[clientKey]/repositories]', error);
        return NextResponse.json(
            { error: error.message ?? 'Failed to list repositories' },
            { status: 500 }
        );
    }
}

// -----------------------------------------------------------------------
// POST /api/sites/[clientKey]/repositories
// Assigns a repository to this Jira site.
// Body: { repoId, repoFullName, provider, htmlUrl }
// -----------------------------------------------------------------------
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ clientKey: string }> }
) {
    try {
        const [paramsResult, paramsError] = await SafeExecute.withSync(async () => params).execute();
        if (paramsError || !paramsResult) return NextResponse.json({ error: paramsError?.message || 'Invalid params' }, { status: 400 });
        const { clientKey } = paramsResult;

        const [site, siteResolveError] = await resolveSite(clientKey);
        if (siteResolveError || !site) return NextResponse.json({ error: siteResolveError || 'Failed to resolve site' }, { status: 500 });

        if (!site.exists || !site.siteUrl) {
            return NextResponse.json({ error: 'Site not found' }, { status: 404 });
        }

        const [body, bodyError] = await SafeExecute.withSync(async () => request.json()).execute();
        if (bodyError || !body) return NextResponse.json({ error: bodyError?.message || 'Invalid request body' }, { status: 400 });
        const parsed = AssignRepoBodySchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Invalid request body', details: parsed.error.flatten() },
                { status: 400 }
            );
        }

        const [repos, reposError] = await SafeExecute.withSync(async () =>
            new AssignRepoToSiteUseCase(siteRepoRepository).execute({
                clientKey,
                siteUrl: site.siteUrl!,
                ...parsed.data,
            })
        ).execute();

        if (reposError) return NextResponse.json({ error: reposError.message || 'Failed to assign repository' }, { status: 500 });

        return NextResponse.json({ repos }, { status: 201 });
    } catch (error: any) {
        console.error('[POST /api/sites/[clientKey]/repositories]', error);
        return NextResponse.json(
            { error: error.message ?? 'Failed to assign repository' },
            { status: 500 }
        );
    }
}
