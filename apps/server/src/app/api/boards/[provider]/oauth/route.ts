import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@oliver/auth';
import { BoardProviderFactory } from '@oliver/boards';
import { Logger, SafeExecute } from '@oliver/core';

/**
 * GET /api/boards/[provider]/oauth
 * Initiates OAuth flow for board providers (Jira, Trello, Asana, Linear)
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ provider: string }> }
) {
    try {
        const [paramsResult, paramsError] = await SafeExecute.withSync(async () => params).execute();
        if (paramsError || !paramsResult) return NextResponse.json({ error: paramsError?.message || 'Invalid params' }, { status: 400 });
        const { provider } = paramsResult;
        const { searchParams } = request.nextUrl;
        const returnTo = searchParams.get('returnTo');
        const metadata = returnTo ? JSON.stringify({ returnTo }) : undefined;

        // Generate and store state token for CSRF protection using AuthService
        const [state, stateError] = await SafeExecute.withSync(async () => 
            AuthService.getInstance().generateState(provider, metadata)
        ).execute();

        if (stateError || !state) {
            Logger.error(`Error generating/storing OAuth state`, stateError?.message);
            return NextResponse.json(
                { error: `Database error while initiating OAuth: ${stateError?.message}` },
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
