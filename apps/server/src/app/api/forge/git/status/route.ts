import { MongoOAuthTokenRepository } from '@oliver/auth';
import { Logger, SafeExecute } from '@oliver/core';
import { GitApiErrorCode } from '@oliver/shared';
import { NextRequest } from 'next/server';
import { ApiRes } from '@/utils/api_response';
import { wrapRoute } from '@/utils/api_handler';
import { z } from 'zod';

/**
 * POST /api/forge/github/status
 * Called by the Forge `getGithubStatus` resolver.
 */
export const POST = wrapRoute({
    bodySchema: z.object({
        accountId: z.string().optional(),
        cloudId: z.string().optional(),
        clientKey: z.string().optional(),
        provider: z.string().optional()
    }).passthrough()
}, async (request, ctx) => {
    // ── Parse body ────────────────────────────────────────────────────────
    const safeBody = ctx.body || {};
    const accountId: string | undefined = safeBody.accountId;
    const cloudId: string | undefined = safeBody.cloudId ?? safeBody.clientKey;
    const provider: string | undefined = safeBody.provider;

    if (!accountId || !cloudId) {
        return ApiRes.badRequest('Missing accountId or cloudId');
    }

    // ── Query oauthtokens ────────────────────────────────────────────────
    const tokenRepo = new MongoOAuthTokenRepository();
    const [oauthToken, queryError] = await SafeExecute.withSync(async () =>
        tokenRepo.findByAtlassianAccountIdAndCloudId(
            accountId,
            cloudId,
            'git',
            provider
        )
    ).execute();

    if (queryError) {
        return ApiRes.error(queryError.message || 'Internal error', 'DATABASE_ERROR', 500);
    }

    // ── Unified Status Handling ──────────────────────────────────────────

    if (!oauthToken) {
        return ApiRes.error(
            'No Git connection found for this account',
            GitApiErrorCode.NOT_CONNECTED,
            404
        );
    }

    if (!oauthToken.accessToken) {
        return ApiRes.error(
            'OAuth token is missing or invalid',
            GitApiErrorCode.TOKEN_MISSING,
            401
        );
    }

    // Treat as disconnected if the token has a known expiry that has passed
    if (oauthToken.expiresAt && oauthToken.expiresAt.getTime() < Date.now()) {
        return ApiRes.error(
            'OAuth token has expired',
            GitApiErrorCode.TOKEN_EXPIRED,
            401
        );
    }

    // Success Case: Fully connected
    return ApiRes.success({
        connected: true,
        provider: oauthToken.provider,
        scope: oauthToken.scope ?? null,
    });
});
