import { MongoOAuthTokenRepository } from '@oliver/auth';
import { Logger, SafeExecute } from '@oliver/core';
import { GitApiErrorCode } from '@oliver/shared';
import { NextRequest } from 'next/server';
import { ApiRes } from '@/utils/api_response';
import { wrapRoute } from '@/utils/api_handler';

/**
 * POST /api/forge/github/status
 * Called by the Forge `getGithubStatus` resolver.
 */
export const POST = wrapRoute(async (request: NextRequest) => {
    // ── Bearer auth ────────────────────────────────────────────────────────
    const authHeader = request.headers.get('authorization') ?? '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    const expectedSecret =
        process.env.API_SECRET ??
        (process.env.FORGE_APP_ID?.includes('/')
            ? process.env.FORGE_APP_ID.split('/').pop()
            : undefined);

    if (!expectedSecret || token !== expectedSecret) {
        return ApiRes.unauthorized('Unauthorized');
    }

    // ── Parse body ────────────────────────────────────────────────────────
    const [body, bodyError] = await SafeExecute.withSync(async () => request.json()).execute();
    if (bodyError) {
        return ApiRes.badRequest(bodyError.message);
    }
    const safeBody = body || {};
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
    return {
        connected: true,
        provider: oauthToken.provider,
        scope: oauthToken.scope ?? null,
    };
});
