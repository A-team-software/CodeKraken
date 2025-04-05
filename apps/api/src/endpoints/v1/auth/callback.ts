// server/api/auth/github/callback.ts
import { exchangeCodeForToken, getGitHubUserDetails } from '../../../features/auth/github_auth'; // Adjust path
import { Logger } from '@oliver/utils'; // Adjust path
import { SafeExecute } from '@oliver/utils';
import { sessionCookie } from '../../../features/auth/session';
import { serialize } from 'cookie';





export default async function handler(req: Request): Promise<Response> {

    const ACCESS_TOKEN_COOKIE_NAME = 'gh_access_token';
    const SESSION_ID_COOKIE_NAME = 'sid'; // Example session cookie name
    // TODO:: create an enum for this.
    const GITHUB_TOKEN_EXPIRY_SECONDS = 30 * 24 * 60 * 60; // 1 hour (use GitHub's value if possible!)
    const SESSION_EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 7 days
    const clientAppRedirect = 'http://localhost:3000/';

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
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // Send only over HTTPS in production
            path: '/',           // Cookie is valid for all paths on the domain
            maxAge: 30 * 24 * 60 * 60, // How long the cookie lasts
            sameSite: 'lax',     // Good default for CSRF protection. Might need 'none' if domains differ significantly AND you use HTTPS ('secure: true'). 'strict' is more restrictive.
        });

        return new Response('Login Successful! Redirecting...', {
            status: 302,
            headers: {
                'Set-Cookie': `${setTokenInCookie}`,
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
