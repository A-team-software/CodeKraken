import { NextRequest, NextResponse } from 'next/server';
import { ProcessOAuthCallbackUseCase, MongoOAuthStateRepository, MongoOAuthTokenRepository } from '@oliver/auth';
import { SynchronizeUserUseCase, MongoUserRepository } from '@oliver/user';
import { TOKEN_COOKIE_MAX_AGE, Logger, SafeExecute } from '@oliver/core';
import { ApiRes } from '@/utils/api_response';
import { wrapRoute } from '@/utils/api_handler';
import { z } from 'zod';

/**
 * GET /api/boards/[provider]/callback
 * OAuth callback endpoint for board provider authentication
 */
export const GET = wrapRoute({
    paramsSchema: z.object({ provider: z.string() })
}, async (request, ctx) => {
    const { provider } = ctx.params;

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
        return ApiRes.badRequest('Missing code or state parameter');
    }

    // Initialize dependencies and Use Case
    const stateRepo = new MongoOAuthStateRepository();
    const tokenRepo = new MongoOAuthTokenRepository();
    const userRepo = new MongoUserRepository();
    const syncUserUseCase = new SynchronizeUserUseCase(userRepo);
    const processCallbackUseCase = new ProcessOAuthCallbackUseCase(stateRepo, tokenRepo, syncUserUseCase);

    // Execute Use Case
    const [result, executeError] = await SafeExecute.withSync(async () =>
        processCallbackUseCase.execute({
            provider,
            providerType: 'board',
            code,
            state
        })
    ).execute();

    if (executeError || !result) {
        return NextResponse.redirect(
            `${request.nextUrl.origin}/integrations?error=${encodeURIComponent(executeError?.message || 'OAuth execution failed')}&provider=${provider}`
        );
    }

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
});
