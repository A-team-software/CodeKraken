import { NextRequest, NextResponse } from 'next/server';
import { Logger } from '@oliver/core';
import { AtlassianConnectService } from '@oliver/application';
import { MongoOAuthTokenRepository } from '@oliver/auth';

/**
 * GET /api/forge/identity/status
 * Checks if a specific Atlassian user (via accountId/cloudId context) has an active Git connection.
 */
export async function GET(request: NextRequest) {
    try {
        const accountId = request.headers.get('x-forge-account-id');
        const cloudId = request.headers.get('x-forge-client-key');

        const { searchParams } = new URL(request.url);
        const provider = searchParams.get('provider'); // Optional: check specific provider

        if (!accountId) {
            return NextResponse.json({ connected: false, error: 'Missing accountId' }, { status: 400 });
        }

        // To map from Atlassian accountId to our internal systemUserId, 
        // we can query the Atlassian site access records or query user accounts directly.
        // The most robust way since we store AccountID in the Atlassian site access mapping:
        const atlassianService = new AtlassianConnectService();

        // Find the system user ID associated with this Atlassian account ID
        const userId = await atlassianService.getUserIdByAtlassianAccountId(accountId);

        if (!userId) {
            return NextResponse.json({ connected: false });
        }

        const tokenRepo = new MongoOAuthTokenRepository();

        // Now check if this user has active OAuth tokens for Git providers
        const tokens = await tokenRepo.findByUser(userId);

        if (!tokens || tokens.length === 0) {
            return NextResponse.json({ connected: false, userId });
        }

        // Filter valid Git tokens
        const validGitTokens = tokens.filter(t =>
            t.providerType === 'git' &&
            (!provider || t.provider === provider) &&
            (!t.expiresAt || t.expiresAt.getTime() > Date.now())
        );

        if (validGitTokens.length === 0) {
            return NextResponse.json({ connected: false, userId });
        }

        // Optional: Return which providers are connected
        const connectedProviders = [...new Set(validGitTokens.map(t => t.provider))];

        return NextResponse.json({
            connected: true,
            userId,
            providers: connectedProviders
        });

    } catch (error: any) {
        Logger.error('Forge identity status check failed', error);
        return NextResponse.json(
            { connected: false, error: error.message || 'Internal error' },
            { status: 500 }
        );
    }
}
