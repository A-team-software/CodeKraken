import { NextRequest, NextResponse } from 'next/server';
import { MongoSiteRepositoryRepository } from '@/lib/infrastructure/db/mongodb/repositories/SiteRepositoryRepository.mongo';
import { MongoAtlassianTenantRepository } from '@/lib/infrastructure/db/mongodb/repositories/AtlassianTenantRepository.mongo';
import { MongoUserJiraSiteAccessRepository } from '@/lib/infrastructure/db/mongodb/repositories/UserJiraSiteAccessRepository.mongo';
import { ListSiteReposUseCase } from '@/lib/application/use_cases/site_repository/ListSiteReposUseCase';
import { AssignRepoToSiteUseCase } from '@/lib/application/use_cases/site_repository/AssignRepoToSiteUseCase';
import { z } from 'zod';

// -----------------------------------------------------------------------
// Singletons (created once per cold-start, reused across requests)
// -----------------------------------------------------------------------
const siteRepoRepository = new MongoSiteRepositoryRepository();
const tenantRepository = new MongoAtlassianTenantRepository();

// -----------------------------------------------------------------------
// POST body schema
// -----------------------------------------------------------------------
const AssignRepoBodySchema = z.object({
    repoId: z.string(),
    repoFullName: z.string(),
    provider: z.enum(['github', 'bitbucket']),
    htmlUrl: z.string().url(),
});

// -----------------------------------------------------------------------
// Shared guard: ensure the clientKey maps to a known Atlassian tenant or access
// -----------------------------------------------------------------------
async function resolveSite(clientKey: string): Promise<{ exists: boolean; siteUrl?: string }> {
    // 1. Check tenant repo (definitive source)
    const tenant = await tenantRepository.findByClientKey(clientKey);
    if (tenant) {
        return { exists: true, siteUrl: tenant.baseUrl };
    }

    // 2. Check access repo (fallback)
    const accessRepo = new MongoUserJiraSiteAccessRepository();
    const access = await accessRepo.findBySite(clientKey);
    if (access && access.length > 0) {
        return { exists: true, siteUrl: access[0].baseUrl };
    }

    return { exists: false };
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
        const { clientKey } = await params;
        const site = await resolveSite(clientKey);

        if (!site.exists) {
            return NextResponse.json({ error: 'Site not found' }, { status: 404 });
        }

        const repos = await new ListSiteReposUseCase(siteRepoRepository).execute(clientKey);
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
        const { clientKey } = await params;
        const site = await resolveSite(clientKey);

        if (!site.exists || !site.siteUrl) {
            return NextResponse.json({ error: 'Site not found' }, { status: 404 });
        }

        const body = await request.json();
        const parsed = AssignRepoBodySchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Invalid request body', details: parsed.error.flatten() },
                { status: 400 }
            );
        }

        const repos = await new AssignRepoToSiteUseCase(siteRepoRepository).execute({
            clientKey,
            siteUrl: site.siteUrl,
            ...parsed.data,
        });

        return NextResponse.json({ repos }, { status: 201 });
    } catch (error: any) {
        console.error('[POST /api/sites/[clientKey]/repositories]', error);
        return NextResponse.json(
            { error: error.message ?? 'Failed to assign repository' },
            { status: 500 }
        );
    }
}
