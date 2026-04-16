import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@oliver/auth';
import { GIT_PROVIDER_REGISTRY } from '@oliver/git';
import { GitHubService } from '@oliver/git';
import { BitbucketService } from '@oliver/git';
import { GITHUB_CALLBACK_URL, BITBUCKET_CALLBACK_URL } from '@oliver/core';

/**
 * GET /api/git/[provider]/oauth
 * Initiate OAuth flow for Git providers
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
    try {
        const { provider } = await params;

        // Verify provider supports OAuth
        const providerMeta = GIT_PROVIDER_REGISTRY[provider];
        if (!providerMeta) {
            return NextResponse.json(
                { error: `Git provider ${provider} not found` },
                { status: 404 }
            );
        }

        if (!providerMeta.supportsOAuth) {
            return NextResponse.json(
                { error: `Git provider ${provider} does not support OAuth` },
                { status: 400 }
            );
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
        const state = await AuthService.getInstance().generateState(provider, finalMetadata);

        // Get login URL from appropriate provider service
        let loginUrl: string;

        if (provider === 'github') {
            loginUrl = GitHubService.getLoginUrl(state, GITHUB_CALLBACK_URL);
        } else if (provider === 'bitbucket') {
            loginUrl = BitbucketService.getLoginUrl(state, BITBUCKET_CALLBACK_URL);
        } else {
            return NextResponse.json(
                { error: `OAuth not implemented for git provider: ${provider}` },
                { status: 501 }
            );
        }

        return NextResponse.json({
            loginUrl,
            state,
            provider,
        });
    } catch (error: any) {
        console.error('Git OAuth initiation error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to initiate OAuth flow' },
            { status: 500 }
        );
    }
}
