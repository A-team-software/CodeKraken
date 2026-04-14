import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@oliver/auth';
import { BoardProviderFactory } from '@oliver/boards';
import { Logger } from '@oliver/core';

/**
 * GET /api/boards/[provider]/oauth
 * Initiates OAuth flow for board providers (Jira, Trello, Asana, Linear)
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ provider: string }> }
) {
    try {
        const { provider } = await params;
        const { searchParams } = request.nextUrl;
        const returnTo = searchParams.get('returnTo');
        const metadata = returnTo ? JSON.stringify({ returnTo }) : undefined;

        // Generate and store state token for CSRF protection using AuthService
        let state: string;
        try {
            state = await AuthService.getInstance().generateState(provider, metadata);
        } catch (error: any) {
            Logger.error(`Error generating/storing OAuth state`, error.message);
            return NextResponse.json(
                { error: `Database error while initiating OAuth: ${error.message}` },
                { status: 500 },
            );
        }

        let loginUrl: string;

        // Generate provider-specific OAuth URL
        try {
            loginUrl = BoardProviderFactory.getLoginUrl(provider, state);
        } catch (error: any) {
            Logger.error(`Unsupported board provider for OAuth: ${provider}`);
            return NextResponse.json(
                { error: `Unsupported board provider for OAuth: ${provider}` },
                { status: 400 }
            );
        }

        Logger.info(`OAuth flow initiated for board provider: ${provider}`);

        return NextResponse.json({
            loginUrl,
            state,
            provider,
        });
    } catch (error: any) {
        Logger.error(`OAuth initiation error`, error.message);
        return NextResponse.json(
            { error: `Failed to initiate OAuth flow: ${error.message}`, },
            { status: 500 }
        );
    }
}
