import { NextRequest, NextResponse } from 'next/server';
import { ProcessOAuthCallbackUseCase, MongoOAuthStateRepository, MongoOAuthTokenRepository } from '@oliver/auth';
import { SynchronizeUserUseCase, MongoUserRepository } from '@oliver/user';
import { TOKEN_COOKIE_NAME, TOKEN_COOKIE_MAX_AGE, Logger, FORGE_GITHUB_CALLBACK_URL, FORGE_BITBUCKET_CALLBACK_URL } from '@oliver/core';
import { SafeExecute } from '@oliver/core/src/errors';
import { ApiRes } from '@/utils/api_response';
import { wrapRoute } from '@/utils/api_handler';

/**
 * GET /api/git/[provider]/callback
 * OAuth callback endpoint for Git provider authentication
 */
export const GET = wrapRoute(async (request: NextRequest, params: Promise<{ provider: string }>) => {
    const [paramsResult, paramsError] = await SafeExecute.withSync(async () => params).execute();
    if (paramsError || !paramsResult) {
        return ApiRes.badRequest('Invalid params');
    }
    const { provider } = paramsResult;

    const { searchParams } = request.nextUrl;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Handle OAuth errors from provider
    if (error) {
        const message = errorDescription || error;
        Logger.error(`Git OAuth error from ${provider}`, message);
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
    const redirectUri = provider === 'bitbucket' ? FORGE_BITBUCKET_CALLBACK_URL : FORGE_GITHUB_CALLBACK_URL;

    const [result, executeError] = await SafeExecute.withSync(async () =>
        processCallbackUseCase.execute({
            provider,
            providerType: 'git',
            code,
            state,
            redirectUri
        })
    ).execute();

    if (executeError || !result) return ApiRes.error(executeError?.message || 'OAuth execution failed');

    const { systemUserId, onboardingStep, accessToken, metadata } = result;

    // If this is a Forge flow, return the auto-closing HTML instead of redirecting
    if (metadata?.forge) {
        return closeWindowResponse(true, undefined, provider);
    }

    // Create response with redirect
    const redirectUrl = metadata?.returnTo
        ? `${request.nextUrl.origin}${metadata.returnTo}`
        : `${request.nextUrl.origin}/setup?step=repos&provider=${provider}`;

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
        name: `${TOKEN_COOKIE_NAME}_git_${provider}`,
        value: accessToken,
        ...cookieOptions,
    });

    response.cookies.set({
        name: `${TOKEN_COOKIE_NAME}_git_user_${provider}`,
        value: systemUserId,
        ...cookieOptions,
    });

    Logger.info(`Successfully authenticated user from git provider ${provider}`, { systemUserId });

    return response;
});

/**
 * Returns an HTML page that posts a message back to the opener and closes itself.
 */
function closeWindowResponse(success: boolean, errorMsg?: string, provider?: string) {
    const payload = JSON.stringify({ success, error: errorMsg, provider });
    const providerName = provider ? (provider.charAt(0).toUpperCase() + provider.slice(1)) : 'Git';

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Authentication Complete</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #f4f5f7; color: #172b4d; }
                .card { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); text-align: center; max-width: 400px; width: 100%; }
                h2 { margin-top: 0; color: #0052cc; }
                .error-h2 { color: #de350b; }
                .spinner { border: 4px solid rgba(0, 0, 0, 0.1); width: 36px; height: 36px; border-radius: 50%; border-left-color: #0052cc; animation: spin 1s linear infinite; margin: 20px auto; }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                .btn { background: #0052cc; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-weight: bold; margin-top: 20px; }
            </style>
        </head>
        <body>
            <div class="card">
                <h2 class="${success ? '' : 'error-h2'}">${success ? 'Connected!' : 'Connection Failed'}</h2>
                <p>${success ? `Successfully connected to ${providerName}. This window will close automatically.` : (errorMsg || 'An error occurred during authentication.')}</p>
                ${success ? '<div class="spinner"></div>' : '<button class="btn" onclick="window.close()">Close Window</button>'}
            </div>
            <script>
                try {
                    if (window.opener) {
                        // Send generic complete event
                        window.opener.postMessage({ type: 'OAUTH_COMPLETE', payload: ${payload} }, '*');
                        
                        // Legacy events for backward compatibility
                        if ('${provider}' === 'github') {
                            window.opener.postMessage({ type: 'GITHUB_CONNECTED', success: ${success} }, '*');
                        } else if ('${provider}' === 'bitbucket') {
                            window.opener.postMessage({ type: 'BITBUCKET_CONNECTED', success: ${success} }, '*');
                        }
                        
                        // Universal success event
                        window.opener.postMessage({ type: 'SCA_AUTH_SUCCESS', success: ${success}, provider: '${provider}' }, '*');
                    }
                } catch(e) {
                    console.error('Failed to post message to opener', e);
                }
                
                ${success ? 'setTimeout(() => window.close(), 1500);' : ''}
            </script>
        </body>
        </html>
    `;

    return new NextResponse(html, {
        headers: { 'Content-Type': 'text/html' },
    });
}
