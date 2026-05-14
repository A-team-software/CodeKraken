import { NextRequest, NextResponse } from 'next/server';
import { SafeExecute } from '@oliver/core/src/errors';
import { cookies } from 'next/headers';
import { AuthService, MongoOAuthTokenRepository } from '@oliver/auth';
import { ProviderType } from '@oliver/core';
import { ApiRes } from '@/utils/api_response';
import { wrapRoute } from '@/utils/api_handler';

/**
 * POST /api/auth/refresh
 * Manually trigger a token refresh for a specific provider
 * Body: { provider: string, providerType: 'git' | 'board' }
 */
export const POST = wrapRoute(async (request: NextRequest) => {
    const [body, bodyError] = await SafeExecute.withSync(async () => request.json()).execute();
    if (bodyError || !body) return ApiRes.badRequest('Invalid request body');
    const { provider, providerType } = body;

    if (!provider || !providerType) {
        return ApiRes.badRequest('Missing provider or providerType');
    }

    // Use the AuthService facade to refresh if needed
    const [result, refreshError] = await SafeExecute.withSync(async () => 
        AuthService.getInstance().getValidTokenAndUserFromRequest(cookies, request, provider, providerType as ProviderType)
    ).execute();

    if (refreshError || !result) {
        return ApiRes.error(
            refreshError?.message || 'No valid session found or refresh failed',
            'REFRESH_FAILED',
            401
        );
    }

    // Fetch the user's token from DB to get the latest one
    const tokenRepo = new MongoOAuthTokenRepository();
    const [tokenData, tokenDataError] = await SafeExecute.withSync(async () => 
        tokenRepo.findByUserAndProvider(result.userId, provider, providerType as ProviderType)
    ).execute();

    if (tokenDataError) return ApiRes.error(tokenDataError.message || 'Failed to fetch token after refresh');

    if (!tokenData) {
        return ApiRes.error('Token not found after refresh', 'TOKEN_NOT_FOUND', 500);
    }

    const accessToken = tokenData.accessToken;
    if (!accessToken) {
        return ApiRes.error('Access token not found after refresh', 'TOKEN_MISSING', 500);
    }

    const response = ApiRes.success({
        refreshed: true,
        expiresAt: tokenData.expiresAt
    });

    // Update cookie with latest access token
    const [core, importCoreError] = await SafeExecute.withSync(async () => import('@oliver/core')).execute();
    if (importCoreError || !core) return ApiRes.error(importCoreError?.message || 'Failed to import core module');
    const { TOKEN_COOKIE_NAME, TOKEN_COOKIE_MAX_AGE } = core;

    let cookieName = '';
    if (providerType === 'git') {
        cookieName = `${TOKEN_COOKIE_NAME}_${provider}`;
    } else {
        cookieName = `board_provider_token_${provider}`;
    }

    response.cookies.set({
        name: cookieName,
        value: accessToken,
        maxAge: TOKEN_COOKIE_MAX_AGE,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
    });

    return response;
});
