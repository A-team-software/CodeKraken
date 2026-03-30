import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth/application/AuthService';
import { MongoOAuthTokenRepository } from '@/lib/auth/infrastructure/repositories/OAuthTokenRepository.mongo';
import { ProviderType } from '@/lib/auth/domain';

/**
 * POST /api/auth/refresh
 * Manually trigger a token refresh for a specific provider
 * Body: { provider: string, providerType: 'git' | 'board' }
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { provider, providerType } = body;

        if (!provider || !providerType) {
            return NextResponse.json(
                { error: 'Missing provider or providerType' },
                { status: 400 }
            );
        }

        // Use the AuthService facade to refresh if needed
        const result = await AuthService.getInstance().getValidTokenAndUserFromRequest(request, provider, providerType as ProviderType);

        if (!result) {
            return NextResponse.json(
                { error: 'No valid session found or refresh failed' },
                { status: 401 }
            );
        }

        // Assuming token helper refreshed the token in DB if needed.
        // But the cookies might be stale if helper doesn't update them directly (which it can't easily).
        // However, if the frontend calls this, it expects new cookies possibly?
        // Or just confirmation that backend token is fresh.

        // If we want to return the new token to client (for them to use in Authorization header), we can.
        // But our architecture relies on httpOnly cookies.
        // So we should update the cookies on this response!

        // Fetch the user's token from DB to get the latest one
        const tokenRepo = new MongoOAuthTokenRepository();
        const tokenData = await tokenRepo.findByUserAndProvider(result.userId, provider, providerType as ProviderType);

        if (!tokenData) {
            return NextResponse.json({ error: 'Token not found after refresh' }, { status: 500 });
        }

        const response = NextResponse.json({
            success: true,
            expiresAt: tokenData.expiresAt
        });

        // Update cookie with latest access token
        const { TOKEN_COOKIE_NAME, TOKEN_COOKIE_MAX_AGE } = await import('@/lib/infrastructure/config/oauth.config');

        let cookieName = '';
        if (providerType === 'git') {
            cookieName = `${TOKEN_COOKIE_NAME}_${provider}`;
        } else {
            cookieName = `board_provider_token_${provider}`;
        }

        response.cookies.set({
            name: cookieName,
            value: tokenData.accessToken,
            maxAge: TOKEN_COOKIE_MAX_AGE,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
        });

        return response;

    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Token refresh failed' },
            { status: 500 }
        );
    }
}
