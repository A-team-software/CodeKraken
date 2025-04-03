// server/api/auth/github/callback.ts
import LocalCacheDB from '@/lib/db/cache';
import { exchangeCodeForToken, getGitHubUserDetails } from '../../../server/features/auth/github_auth'; // Adjust path
import { Logger } from '@/utils/logger/logger'; // Adjust path
import safeExecute, { safeExecuteNoSync } from '@/utils/errors/error_handler';
import { sessionCookie } from '@/server/features/auth/session';
import { serialize } from 'cookie';
export default async function handler(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');

    Logger.logInfo(`Received GitHub callback with code: ${code ? 'present' : 'missing'}, state: ${state}`);

    if (!code || !state) {
        const error = url.searchParams.get('error');
        const errorDesc = url.searchParams.get('error_description');
        Logger.logError(`GitHub callback error: ${error} - ${errorDesc}`);
        // Redirect to an error page or show an error message
        return new Response(JSON.stringify({ error: "GitHub authorization failed or was cancelled.", details: errorDesc || error }), { status: 400 });
    }

    try {
        // Verify state and exchange code for token
        const tokenInfo = await exchangeCodeForToken(code, state);

        if (!tokenInfo) {
            // exchangeCodeForToken logs the specific error (e.g., invalid state, network error)
            // Redirect to a login failure page
            return new Response(JSON.stringify({ error: `Failed to verify GitHub authorization or exchange code. ${tokenInfo}` }), { status: 401 });
        }



        Logger.logInfo(`GitHub token acquired successfully. Granted scopes: ${tokenInfo.grantedScopes.join(', ')}`);


        // --- User Identification & Session Management (IMPORTANT!) ---
        // 1. Get User Info from GitHub using the token
        const githubUser = await getGitHubUserDetails(tokenInfo.accessToken);
        if (!githubUser) {
            return new Response(JSON.stringify({ error: "Failed to fetch GitHub user details after login." }), { status: 500 });
        }


        // Redirect user to their dashboard or the page they came from
        // In this example, just show success
        // return new Response(JSON.stringify({ token: tokenInfo.accessToken }), { status: 401 });
        const setTokenInCookie = serialize('accessToken', tokenInfo.accessToken, {
            httpOnly: true,      // VERY Important: Cookie cannot be accessed via client-side JS
            secure: process.env.NODE_ENV === 'production', // Send only over HTTPS in production
            path: '/',           // Cookie is valid for all paths on the domain
            maxAge: 30 * 24 * 60 * 60, // How long the cookie lasts
            sameSite: 'lax',     // Good default for CSRF protection. Might need 'none' if domains differ significantly AND you use HTTPS ('secure: true'). 'strict' is more restrictive.
        });
        const [sessionId, error] = safeExecuteNoSync(sessionCookie.get, 'sessionId');
        let setSessionIDCookie: string | null;
        if (error == null || sessionId !== null) {
            setSessionIDCookie = serialize('sessionId', tokenInfo.accessToken, {
                httpOnly: true,      // VERY Important: Cookie cannot be accessed via client-side JS
                secure: process.env.NODE_ENV === 'production', // Send only over HTTPS in production
                path: '/',           // Cookie is valid for all paths on the domain
                maxAge: 30 * 24 * 60 * 60, // How long the cookie lasts
                sameSite: 'lax',     // Good default for CSRF protection. Might need 'none' if domains differ significantly AND you use HTTPS ('secure: true'). 'strict' is more restrictive.
            });
        } else {
            setSessionIDCookie = null;
        }


        return new Response('Login Successful! Redirecting...', {
            status: 302, // Or 200 with some JSON, depends on your flow
            headers: {
                'Set-Cookie': `${setTokenInCookie}-${setSessionIDCookie}`,
                'Location': 'http://localhost:3000/', // Or wherever the user should go in the Next.js app
                // --- CORS Headers (Essential if domains/ports differ!) ---
                'Access-Control-Allow-Origin': '*', // Or your Next.js app's origin
                'Access-Control-Allow-Credentials': 'true', // Required for cookies in CORS requests
            },
        });
        // return new Response(JSON.stringify({
        //     message: `Successfully authenticated GitHub user: ${githubUser.login}`,
        //     // In real app, don't send token to client
        // }), {
        //     status: 200,
        //     // headers: headers // Add headers if setting cookie
        // });
        // return Response.redirect('/dashboard', 302); // Redirect to dashboard
    } catch (error: any) {
        Logger.logError("Error processing GitHub callback:", error.message);
        return new Response(JSON.stringify({ error: "Internal server error during GitHub callback." }), { status: 500 });
    }
}
