import { NextRequest, NextResponse } from 'next/server';
import { MongoSiteRepositoryRepository } from '@oliver/db';
import { MongoAtlassianTenantRepository } from '@oliver/db';
import { RemoveRepoFromSiteUseCase } from '@oliver/application';
import { GitProviderEnum, SafeExecute } from '@oliver/core';

const siteRepoRepository = new MongoSiteRepositoryRepository();
const tenantRepository = new MongoAtlassianTenantRepository();

// -----------------------------------------------------------------------
// DELETE /api/sites/[clientKey]/repositories/[provider]/[repoId]
// Unassigns a repository from this Jira site.
// -----------------------------------------------------------------------
export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ clientKey: string; provider: string; repoId: string }> }
) {
    try {
        const [paramsResult, paramsError] = await SafeExecute.withSync(async () => params).execute();
        if (paramsError || !paramsResult) return NextResponse.json({ error: paramsError?.message || 'Invalid params' }, { status: 400 });
        const { clientKey, provider, repoId } = paramsResult;

        // Validate provider is supported
        const providerParsed = GitProviderEnum.safeParse(provider);
        if (!providerParsed.success) {
            return NextResponse.json(
                { error: `Unsupported provider "${provider}". Must be "github" or "bitbucket".` },
                { status: 400 }
            );
        }

        // Guard: clientKey must be a known tenant
        const [tenant, tenantError] = await SafeExecute.withSync(async () => 
            tenantRepository.findByClientKey(clientKey)
        ).execute();
        if (tenantError) return NextResponse.json({ error: tenantError.message || 'Failed to look up site' }, { status: 500 });
        if (!tenant) {
            return NextResponse.json({ error: 'Site not found' }, { status: 404 });
        }

        const [result, removeError] = await SafeExecute.withSync(async () => 
            new RemoveRepoFromSiteUseCase(siteRepoRepository).execute({
                clientKey,
                repoId,
                provider: providerParsed.data,
            })
        ).execute();

        if (removeError) return NextResponse.json({ error: removeError.message || 'Failed to remove repository' }, { status: 500 });

        return NextResponse.json(result, { status: 200 });
    } catch (error: any) {
        console.error('[DELETE /api/sites/[clientKey]/repositories/[provider]/[repoId]]', error);
        return NextResponse.json(
            { error: error.message ?? 'Failed to remove repository' },
            { status: 500 }
        );
    }
}
