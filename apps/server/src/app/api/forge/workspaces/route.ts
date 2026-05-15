import { NextRequest } from 'next/server';
import { MongoOAuthTokenRepository } from '@oliver/auth';
import { GetWorkspacesUseCase } from '@oliver/git';
import { Logger, SafeExecute } from '@oliver/core';
import { ApiRes } from '@/utils/api_response';
import { GitApiErrorCode } from '@oliver/shared';
import { wrapRoute } from '@/utils/api_handler';
import { z } from 'zod';

export const GET = wrapRoute({
    querySchema: z.object({ provider: z.string() })
}, async (request, ctx) => {
    const accountId = request.headers.get('x-forge-account-id');
    const cloudId = request.headers.get('x-forge-client-key');

    if (!accountId || !cloudId) {
        return ApiRes.badRequest('Missing X-Forge-Account-Id or X-Forge-Client-Key header');
    }

    const { provider } = ctx.query;

    const tokenRepo = new MongoOAuthTokenRepository();
    const [oauthToken, queryError] = await SafeExecute.withSync(async () =>
        tokenRepo.findByAtlassianAccountIdAndCloudId(accountId, cloudId, 'git', provider)
    ).execute();

    if (queryError) {
        Logger.error('forge/workspaces: token query failed', queryError);
        return ApiRes.error('Failed to query token', 'DATABASE_ERROR', 500);
    }

    if (!oauthToken) {
        return ApiRes.error(
            `No ${provider} connection found. Please connect ${provider} in the Jira panel.`,
            GitApiErrorCode.NOT_CONNECTED,
            404
        );
    }

    if (oauthToken.expiresAt && oauthToken.expiresAt.getTime() < Date.now()) {
        return ApiRes.error(
            `${provider} token has expired. Please reconnect.`,
            GitApiErrorCode.TOKEN_EXPIRED,
            401
        );
    }

    const accessToken = oauthToken.accessToken;
    if (!accessToken) {
        return ApiRes.error(
            `${provider} connection is inactive. Please reconnect.`,
            GitApiErrorCode.TOKEN_MISSING,
            401
        );
    }

    const useCase = new GetWorkspacesUseCase();
    const [workspaces, workspacesError] = await SafeExecute.withSync(async () =>
        useCase.execute({
            providerType: provider,
            token: accessToken,
        })
    ).execute();

    if (workspacesError) {
        Logger.error('forge/workspaces: provider fetch failed', workspacesError);
        return ApiRes.error(
            workspacesError.message || 'Failed to fetch workspaces from provider',
            GitApiErrorCode.PROVIDER_ERROR,
            502
        );
    }

    return { workspaces: workspaces ?? [] };
});
