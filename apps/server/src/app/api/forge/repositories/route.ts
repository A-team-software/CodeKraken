import { NextRequest, NextResponse } from 'next/server';
import { MongoOAuthTokenRepository } from '@oliver/auth';
import { GetRepositoriesUseCase } from '@oliver/git';
import { Logger, SafeExecute } from '@oliver/core';

/**
 * GET /api/forge/repositories
 *
 * Called by the Forge `getRepositories` resolver via backendFetch.
 * Auth: Bearer <API_SECRET>, with X-Forge-Account-Id and X-Forge-Client-Key headers.
 *
 * Query params:
 *   provider  — 'github' | 'bitbucket' (default: 'github')
 *   page      — page number (default: 1)
 *   perPage   — results per page (default: 50)
 *
 * Looks up the stored OAuth token from the `oauthtokens` collection by
 * atlassianAccountId + cloudId — exactly the fields written during the
 * Forge OAuth callback — then fetches repos from the provider API.
 */
export async function GET(request: NextRequest) {
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
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // ── Forge identity headers ──────────────────────────────────────────────
        const accountId = request.headers.get('x-forge-account-id');
        const cloudId = request.headers.get('x-forge-client-key');

        if (!accountId || !cloudId) {
            return NextResponse.json(
                { error: 'Missing X-Forge-Account-Id or X-Forge-Client-Key header' },
                { status: 400 }
            );
        }

        // ── Query params ───────────────────────────────────────────────────────
        const { searchParams } = request.nextUrl;
        const provider = (searchParams.get('provider') || 'github').toLowerCase();
        const page = parseInt(searchParams.get('page') || '1', 10);
        const perPage = parseInt(searchParams.get('perPage') || '50', 10);

        // ── Look up OAuth token by Forge identity ─────────────────────────────
        const tokenRepo = new MongoOAuthTokenRepository();
        const [oauthToken, queryError] = await SafeExecute.withSync(async () =>
            tokenRepo.findByAtlassianAccountIdAndCloudId(accountId, cloudId, 'git', provider)
        ).execute();

        if (queryError) {
            Logger.error('forge/repositories: token query failed', queryError);
            return NextResponse.json({ error: 'Failed to query token' }, { status: 500 });
        }

        if (!oauthToken) {
            return NextResponse.json(
                { error: `No ${provider} connection found. Please connect ${provider} in the Jira panel.` },
                { status: 404 }
            );
        }

        // Treat expired tokens as disconnected
        if (oauthToken.expiresAt && oauthToken.expiresAt.getTime() < Date.now()) {
            return NextResponse.json(
                { error: 'GitHub token has expired. Please reconnect.' },
                { status: 401 }
            );
        }

        // ── Fetch repositories from provider ───────────────────────────────────
        const useCase = new GetRepositoriesUseCase();
        const [repositories, reposError] = await SafeExecute.withSync(async () =>
            useCase.execute({
                providerType: provider,
                token: oauthToken.accessToken,
                page,
                perPage,
            })
        ).execute();

        if (reposError) {
            Logger.error('forge/repositories: provider fetch failed', reposError);
            return NextResponse.json(
                { error: reposError.message || 'Failed to fetch repositories from provider' },
                { status: 502 }
            );
        }

        return NextResponse.json({ repositories: repositories ?? [] });
    } catch (error: any) {
        Logger.error('forge/repositories: unexpected error', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
