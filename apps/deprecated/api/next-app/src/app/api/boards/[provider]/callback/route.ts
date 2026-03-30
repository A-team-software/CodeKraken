import { NextRequest, NextResponse } from 'next/server';
import { ProcessOAuthCallbackUseCase } from '@/lib/auth/application/use_cases/ProcessOAuthCallbackUseCase';
import { MongoOAuthStateRepository } from '@/lib/auth/infrastructure/repositories/OAuthStateRepository.mongo';
import { MongoOAuthTokenRepository } from '@/lib/auth/infrastructure/repositories/OAuthTokenRepository.mongo';
import { SynchronizeUserUseCase } from '@/lib/user/application/use_cases/SynchronizeUserUseCase';
import { MongoUserRepository } from '@/lib/user/infrastructure/repositories/UserRepository.mongo';
import { TOKEN_COOKIE_MAX_AGE } from '@/lib/infrastructure/config/oauth.config';
import { Logger } from '@/lib/infrastructure/logging/logger';

/**
 * GET /api/boards/[provider]/callback
 * OAuth callback endpoint for board provider authentication
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ provider: string }> }
) {
    const { provider } = await params;

    try {
        const { searchParams } = request.nextUrl;
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        // Handle OAuth errors from provider
        if (error) {
            const message = errorDescription || error;
            Logger.error(`Board OAuth error from ${provider}`, message);
            return NextResponse.redirect(
                `${request.nextUrl.origin}/integrations?error=${encodeURIComponent(message)}&provider=${provider}`
            );
        }

        // Validate required parameters
        if (!code || !state) {
            return NextResponse.json(
                { error: 'Missing code or state parameter' },
                { status: 400 }
            );
        }

        // Initialize dependencies and Use Case
        const stateRepo = new MongoOAuthStateRepository();
        const tokenRepo = new MongoOAuthTokenRepository();
        const userRepo = new MongoUserRepository();
        const syncUserUseCase = new SynchronizeUserUseCase(userRepo);
        const processCallbackUseCase = new ProcessOAuthCallbackUseCase(stateRepo, tokenRepo, syncUserUseCase);

        // Execute Use Case
        const result = await processCallbackUseCase.execute({
            provider,
            providerType: 'board',
            code,
            state
        });

        const { systemUserId, onboardingStep, accessToken, metadata } = result;

        // Create response with redirect
        const redirectUrl = metadata?.returnTo
            ? `${request.nextUrl.origin}${metadata.returnTo}`
            : onboardingStep === 'completed'
                ? `${request.nextUrl.origin}/dashboard`
                : `${request.nextUrl.origin}/setup?step=${onboardingStep}`;

        const response = NextResponse.redirect(redirectUrl, {
            status: 302,
        });

        // Set secure httpOnly cookies
        const cookieOptions = {
            maxAge: TOKEN_COOKIE_MAX_AGE,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax' as const,
            path: '/',
        };

        response.cookies.set({
            name: `board_provider_token_${provider}`,
            value: accessToken,
            ...cookieOptions,
        });

        response.cookies.set({
            name: `board_provider_user_${provider}`,
            value: systemUserId,
            ...cookieOptions,
        });

        response.cookies.set({
            name: `user_onboarding_step`,
            value: onboardingStep,
            ...cookieOptions,
        });

        Logger.info(`Successfully authenticated user from board provider ${provider}`, { systemUserId, onboardingStep });

        return response;
    } catch (error: any) {
        const message = error?.message || 'OAuth callback failed';
        Logger.error(`Board OAuth callback error for ${provider}`, { message });

        return NextResponse.redirect(
            `${request.nextUrl.origin}/integrations?error=${encodeURIComponent(message)}&provider=${provider}`
        );
    }
}
