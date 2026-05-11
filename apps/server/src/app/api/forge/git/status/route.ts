import { MongoOAuthTokenRepository } from '@oliver/auth';
import { Logger, SafeExecute } from '@oliver/core';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/forge/github/status
 * Called by the Forge `getGithubStatus` resolver.
 *
 * Body: { accountId: string, cloudId: string, clientKey?: string }
 *
 * Queries the oauthtokens collection directly by atlassianAccountId + cloudId —
 * the exact fields saved during the OAuth callback — avoiding a slow two-step lookup.
 *
 * Returns:
 *   { connected: true,  provider: string, scope: string | null }
 *   { connected: false }
 */
export async function POST(request: NextRequest) {
    try {
        // ── Bearer auth ────────────────────────────────────────────────────────
        const authHeader = request.headers.get('authorization') ?? '';
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

        const expectedSecret =
            process.env.API_SECRET ??
            (process.env.FORGE_APP_ID?.includes('/')
                ? process.env.FORGE_APP_ID.split('/').pop()
                : undefined);

        if (!expectedSecret || token !== expectedSecret) {
            return NextResponse.json({ connected: false, error: 'Unauthorized' }, { status: 401 });
        }

        // ── Parse body ────────────────────────────────────────────────────────
        const [body, bodyError] = await SafeExecute.withSync(async () => request.json()).execute();
        if (bodyError) {
            return NextResponse.json({ connected: false, error: bodyError?.message }, { status: 400 });
        }
        const safeBody = body || {};
        const accountId: string | undefined = safeBody.accountId;
        const cloudId: string | undefined = safeBody.cloudId ?? safeBody.clientKey;
        const provider: string | undefined = safeBody.provider;

        if (!accountId || !cloudId) {
            return NextResponse.json(
                { connected: false, error: 'Missing accountId or cloudId' },
                { status: 400 }
            );
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

        if (queryError) return NextResponse.json({ connected: false, error: queryError.message || 'Internal error' }, { status: 500 });

        if (!oauthToken) {
            return NextResponse.json({ connected: false });
        }

        if (!oauthToken.accessToken) {
            return NextResponse.json({ connected: false, reason: 'no_token' });
        }

        // Treat as disconnected if the token has a known expiry that has passed
        if (oauthToken.expiresAt && oauthToken.expiresAt.getTime() < Date.now()) {
            return NextResponse.json({ connected: false, reason: 'token_expired' });
        }

        return NextResponse.json({
            connected: true,
            provider: oauthToken.provider,
            scope: oauthToken.scope ?? null,
        });
    } catch (error: any) {
        Logger.error('Forge github/status failed', error);
        return NextResponse.json(
            { connected: false, error: error.message ?? 'Internal error' },
            { status: 500 }
        );
    }
}
