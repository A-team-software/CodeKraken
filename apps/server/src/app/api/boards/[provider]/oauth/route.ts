import { NextRequest } from 'next/server';
import { AuthService } from '@oliver/auth';
import { BoardProviderFactory } from '@oliver/boards';
import { Logger, SafeExecute } from '@oliver/core';
import { ApiRes } from '@/utils/api_response';
import { wrapRoute } from '@/utils/api_handler';
import { z } from 'zod';

/**
 * GET /api/boards/[provider]/oauth
 * Initiates OAuth flow for board providers (Jira, Trello, Asana, Linear)
 */
export const GET = wrapRoute({
    paramsSchema: z.object({ provider: z.string() })
}, async (request, ctx) => {
    const { provider } = ctx.params;
    const { searchParams } = request.nextUrl;
    const returnTo = searchParams.get('returnTo');
    const metadata = returnTo ? JSON.stringify({ returnTo }) : undefined;

    // Generate and store state token for CSRF protection using AuthService
    const [state, stateError] = await SafeExecute.withSync(async () => 
        AuthService.getInstance().generateState(provider, metadata)
    ).execute();

    if (stateError || !state) {
        Logger.error(`Error generating/storing OAuth state`, stateError?.message);
        return ApiRes.error(`Database error while initiating OAuth: ${stateError?.message}`);
    }

    let loginUrl: string;

    // Generate provider-specific OAuth URL
    try {
        loginUrl = BoardProviderFactory.getLoginUrl(provider, state);
    } catch (error: any) {
        Logger.error(`Unsupported board provider for OAuth: ${provider}`);
        return ApiRes.badRequest(`Unsupported board provider for OAuth: ${provider}`);
    }

    Logger.info(`OAuth flow initiated for board provider: ${provider}`);

    return {
        loginUrl,
        state,
        provider,
    };
});
