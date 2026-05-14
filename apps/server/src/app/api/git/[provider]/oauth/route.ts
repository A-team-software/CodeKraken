import { NextRequest } from 'next/server';
import { AuthService } from '@oliver/auth';
import { GIT_PROVIDER_REGISTRY, GitHubService, BitbucketService } from '@oliver/git';
import { GITHUB_CALLBACK_URL, BITBUCKET_CALLBACK_URL } from '@oliver/core';
import { SafeExecute } from '@oliver/core/src/errors';
import { ApiRes } from '@/utils/api_response';
import { wrapRoute } from '@/utils/api_handler';
import { z } from 'zod';

/**
 * GET /api/git/[provider]/oauth
 * Initiate OAuth flow for Git providers
 */
export const GET = wrapRoute({
    paramsSchema: z.object({ provider: z.string() })
}, async (request, ctx) => {
    const { provider } = ctx.params;

    // Verify provider supports OAuth
    const providerMeta = GIT_PROVIDER_REGISTRY[provider];
    if (!providerMeta) {
        return ApiRes.notFound(`Git provider ${provider} not found`);
    }

    if (!providerMeta.supportsOAuth) {
        return ApiRes.badRequest(`Git provider ${provider} does not support OAuth`);
    }

    // Generate and store state token using AuthService
    const { searchParams } = new URL(request.url);
    const metadataString = searchParams.get('metadata');
    let metadataObj: any = {};
    if (metadataString) {
        try {
            metadataObj = JSON.parse(metadataString);
        } catch (e) {
            console.warn('Failed to parse metadata JSON', e);
        }
    }
    const returnTo = searchParams.get('returnTo');
    if (returnTo) {
        metadataObj.returnTo = returnTo;
    }
    const finalMetadata = Object.keys(metadataObj).length > 0 ? JSON.stringify(metadataObj) : undefined;
    const [state, stateError] = await SafeExecute.withSync(async () => 
        AuthService.getInstance().generateState(provider, finalMetadata)
    ).execute();

    if (stateError || !state) return ApiRes.error(stateError?.message || 'Failed to generate state');

    // Get login URL from appropriate provider service
    let loginUrl: string;

    if (provider === 'github') {
        loginUrl = GitHubService.getLoginUrl(state, GITHUB_CALLBACK_URL);
    } else if (provider === 'bitbucket') {
        loginUrl = BitbucketService.getLoginUrl(state, BITBUCKET_CALLBACK_URL);
    } else {
        return ApiRes.error(`OAuth not implemented for git provider: ${provider}`, 'NOT_IMPLEMENTED', 501);
    }

    return {
        loginUrl,
        state,
        provider,
    };
});
