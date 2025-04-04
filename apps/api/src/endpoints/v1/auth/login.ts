// server/api/auth/github/login.ts
import { getGitHubAuthUrl } from '../../../features/auth/github_auth'; // Adjust path
import { Logger } from '@oliver/utils'; // Adjust path

export default async function handler(req: Request): Promise<Response> {
    if (req.method !== 'GET') {
        Logger.logError("Invalid request method. Only GET is allowed.");
        return new Response(JSON.stringify({ error: "Invalid request method. Only GET is allowed." }), { status: 405 });
    }
    try {
        const { url, state } = await getGitHubAuthUrl();
        Logger.logInfo(`Redirecting user to GitHub for authorization (state: ${state})`);

        // In a real app with sessions, you'd store the state securely associated with the user's session here.
        // e.g., req.session.oauthState = state; await req.session.save();

        // Redirect the user's browser to GitHub
        return Response.redirect(url, 302); // 302 Found - temporary redirect

    } catch (error: any) {
        Logger.logError("Error generating GitHub auth URL:", error.message);
        return new Response(JSON.stringify({ error: "Failed to initiate GitHub login" }), { status: 500 });
    }
}
