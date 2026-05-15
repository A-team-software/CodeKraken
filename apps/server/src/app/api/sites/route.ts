import { NextRequest } from 'next/server';
import { MongoAtlassianTenantRepository, MongoUserJiraSiteAccessRepository } from '@oliver/db';
import { GetUserJiraSitesUseCase } from '@oliver/application';
import { Logger, SafeExecute } from '@oliver/core';
import { ApiRes } from '@/utils/api_response';
import { wrapRoute } from '@/utils/api_handler';

/**
 * GET /api/sites
 *
 * Returns Jira sites that the authenticated user has access to.
 * Requires authentication via board_provider_user_jira cookie.
 * Used by the UI to populate the "Assign to site" dropdown on step 3 of onboarding.
 */
export const GET = wrapRoute({}, async (request, ctx) => {
    // Extract userId from the board_provider_user_jira cookie
    const userId = request.cookies.get('board_provider_user_jira')?.value;

    if (!userId) {
        Logger.error('GET /api/sites: No authenticated user found in cookie');
        return ApiRes.unauthorized('User not authenticated. Please complete Jira authentication first.');
    }

    Logger.info('Fetching Jira sites for user', { userId });

    // Initialize repositories
    const accessRepo = new MongoUserJiraSiteAccessRepository();
    const tenantRepo = new MongoAtlassianTenantRepository();
    const useCase = new GetUserJiraSitesUseCase(accessRepo);

    // Execute use case to get user's site accesses
    const [userSiteAccesses, accessError] = await SafeExecute.withSync(async () => 
        useCase.execute({ userId })
    ).execute();

    if (accessError || !userSiteAccesses) return ApiRes.error(accessError?.message || 'Failed to fetch site access');

    if (userSiteAccesses.length === 0) {
        Logger.info('No Jira sites found for user', { userId });
        return { sites: [] };
    }

    // Fetch site details for the sites user has access to
    const sites: Array<{
        clientKey: string;
        baseUrl: string;
        productType: string;
        description: string | undefined;
        key: string;
    }> = [];

    for (const access of userSiteAccesses) {
        const [tenant, tenantError] = await SafeExecute.withSync(async () =>
            tenantRepo.findByClientKey(access.clientKey)
        ).execute();

        if (tenantError) {
            Logger.warn(`Failed to fetch tenant details for ${access.clientKey}: ${tenantError.message}`);
            // Fallback: still include the site with basic info from the access record
            sites.push({
                clientKey: access.clientKey,
                baseUrl: access.baseUrl,
                productType: 'jira',
                description: 'Jira Site',
                key: access.baseUrl ? new URL(access.baseUrl).hostname.split('.')[0] : 'Jira Site',
            });
        } else {
            // Always add the site from access record, enriched by tenant info if available
            sites.push({
                clientKey: access.clientKey,
                baseUrl: access.baseUrl || (tenant?.baseUrl ?? ''),
                productType: tenant?.productType ?? 'jira',
                description: tenant?.description ?? 'Jira Site',
                key: tenant?.key ?? (access.baseUrl ? new URL(access.baseUrl).hostname.split('.')[0] : 'Jira Site'),
            });
        }
    }

    Logger.debug(`Returning ${sites.length} Jira sites for user`, { userId });
    return { sites };
});
