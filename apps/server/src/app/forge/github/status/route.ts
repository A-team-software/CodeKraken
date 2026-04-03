import { NextRequest, NextResponse } from 'next/server';
import { MongoOAuthTokenRepository } from '@oliver/auth';
import { Logger } from '@oliver/core';

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
        const body = await request.json().catch(() => ({}));
        const accountId: string | undefined = body.accountId;
        const cloudId: string | undefined = body.cloudId ?? body.clientKey;
        const provider: string | undefined = body.provider;

        if (!accountId || !cloudId) {
            return NextResponse.json(
                { connected: false, error: 'Missing accountId or cloudId' },
                { status: 400 }
            );
        }

        // ── Query oauthtokens ────────────────────────────────────────────────
        const tokenRepo = new MongoOAuthTokenRepository();
        const oauthToken = await tokenRepo.findByAtlassianAccountIdAndCloudId(
            accountId,
            cloudId,
            'git',
            provider
        );

        if (!oauthToken) {
            return NextResponse.json({ connected: false });
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
