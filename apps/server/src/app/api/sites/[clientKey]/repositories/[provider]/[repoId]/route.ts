import { NextRequest, NextResponse } from 'next/server';
import { MongoSiteRepositoryRepository } from '@oliver/db';
import { MongoAtlassianTenantRepository } from '@oliver/db';
import { RemoveRepoFromSiteUseCase } from '@oliver/application';
import { GitProviderEnum, SafeExecute } from '@oliver/core';
import { ApiRes } from '@/utils/api_response';
import { wrapRoute } from '@/utils/api_handler';
import { z } from 'zod';

const siteRepoRepository = new MongoSiteRepositoryRepository();
const tenantRepository = new MongoAtlassianTenantRepository();

// -----------------------------------------------------------------------
// DELETE /api/sites/[clientKey]/repositories/[provider]/[repoId]
// Unassigns a repository from this Jira site.
// -----------------------------------------------------------------------
export const DELETE = wrapRoute({
    paramsSchema: z.object({
        clientKey: z.string(),
        provider: z.string(),
        repoId: z.string()
    })
}, async (_request, ctx) => {
    const { clientKey, provider, repoId } = ctx.params;

        // Validate provider is supported
        const providerParsed = GitProviderEnum.safeParse(provider);
        if (!providerParsed.success) {
            return ApiRes.badRequest(`Unsupported provider "${provider}". Must be "github" or "bitbucket".`);
        }

        // Guard: clientKey must be a known tenant
        const [tenant, tenantError] = await SafeExecute.withSync(async () => 
            tenantRepository.findByClientKey(clientKey)
        ).execute();
        if (tenantError) return ApiRes.error(tenantError.message || 'Failed to look up site', 'INTERNAL', 500);
        if (!tenant) {
            return ApiRes.notFound('Site not found');
        }

        const [result, removeError] = await SafeExecute.withSync(async () => 
            new RemoveRepoFromSiteUseCase(siteRepoRepository).execute({
                clientKey,
                repoId,
                provider: providerParsed.data,
            })
        ).execute();

        if (removeError) return ApiRes.error(removeError.message || 'Failed to remove repository', 'INTERNAL', 500);

        return { success: true, result };
});
