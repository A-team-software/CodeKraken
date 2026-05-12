import { NextRequest, NextResponse } from 'next/server';
import { MongoOAuthTokenRepository } from '@oliver/auth';
import { GetWorkspacesUseCase } from '@oliver/git';
import { Logger, SafeExecute } from '@oliver/core';

export async function GET(request: NextRequest) {
    try {
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

        const accountId = request.headers.get('x-forge-account-id');
        const cloudId = request.headers.get('x-forge-client-key');

        if (!accountId || !cloudId) {
            return NextResponse.json(
                { error: 'Missing X-Forge-Account-Id or X-Forge-Client-Key header' },
                { status: 400 }
            );
        }

        const { searchParams } = request.nextUrl;
        const provider = searchParams.get('provider');
        if (!provider) {
            return NextResponse.json({ error: 'Missing provider query parameter' }, { status: 400 });
        }

        const tokenRepo = new MongoOAuthTokenRepository();
        const [oauthToken, queryError] = await SafeExecute.withSync(async () =>
            tokenRepo.findByAtlassianAccountIdAndCloudId(accountId, cloudId, 'git', provider)
        ).execute();

        if (queryError) {
            Logger.error('forge/workspaces: token query failed', queryError);
            return NextResponse.json({ error: 'Failed to query token' }, { status: 500 });
        }

        if (!oauthToken) {
            return NextResponse.json(
                { error: `No ${provider} connection found. Please connect ${provider} in the Jira panel.` },
                { status: 404 }
            );
        }

        if (oauthToken.expiresAt && oauthToken.expiresAt.getTime() < Date.now()) {
            return NextResponse.json(
                { error: `${provider} token has expired. Please reconnect.` },
                { status: 401 }
            );
        }

        const accessToken = oauthToken.accessToken;
        if (!accessToken) {
            return NextResponse.json(
                { error: `${provider} connection is inactive. Please reconnect.` },
                { status: 401 }
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
            return NextResponse.json(
                { error: workspacesError.message || 'Failed to fetch workspaces from provider' },
                { status: 502 }
            );
        }

        return NextResponse.json({ workspaces: workspaces ?? [] });
    } catch (error: any) {
        Logger.error('forge/workspaces: unexpected error', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
