// server/services/authService.ts
import { config } from '../../env_config';
import { Logger } from '@oliver/utils';
import crypto from 'crypto'; // For generating 'state'
import { SafeExecute } from '@oliver/utils';
import SessionCookieStore, { sessionCookie } from './session';

// !!! --- WARNING: NON-PRODUCTION STATE STORAGE --- !!!
// This uses simple in-memory storage. In production, use secure sessions
// (e.g., signed cookies, Redis-backed sessions) to store state and tokens.
const stateStore = new Map<string, { timestamp: number }>();
const tokenStore = new Map<string, { accessToken: string; scopes: string[]; githubUserId: string; }>(); // Map session ID/user ID -> token info
// !!! --------------------------------------------- !!!




const GITHUB_AUTH_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GITHUB_USER_API_URL = 'https://api.github.com/user';

const STATE_TTL_MS = 1000 * 60 * 1000; // 5 minutes for state validity

/** Generates the GitHub authorization URL to redirect the user to */
export async function getGitHubAuthUrl(): Promise<{ url: string; state: string }> {
    const state = crypto.randomBytes(16).toString('hex');
    // Store state temporarily (replace with secure session storage)
    stateStore.set(state, { timestamp: Date.now() });



    Logger.logInfo(`Generated state ${state} for GitHub OAuth flow`);
    // Clean up old states periodically (in a real app, sessions handle this)
    cleanupOldStates();

    const params = new URLSearchParams({
        client_id: config.github.clientId || '',
        redirect_uri: config.github.callbackUrl || '',
        scope: config.github.scopes || '',
        state: state,
    });
    console.log(params.toString());
    return { url: `${GITHUB_AUTH_URL}?${params.toString()}`, state };
}

/** Verifies the state parameter and exchanges the code for an access token */
export async function exchangeCodeForToken(code: string, receivedState: string): Promise<{ accessToken: string; grantedScopes: string[] } | null> {
    Logger.logInfo(`Attempting to exchange code for token with state: ${receivedState}`);

    // --- 1. Verify State (CSRF Protection) ---
    // Retrieve and validate state (replace with secure session lookup)
    const storedStateData = stateStore.get(receivedState);
    if (!storedStateData || (Date.now() - storedStateData.timestamp > STATE_TTL_MS)) {
        Logger.logError(`Invalid or expired state received: ${receivedState}. Possible CSRF attack.`);
        stateStore.delete(receivedState); // Clean up used/invalid state
        return null;
    }
    stateStore.delete(receivedState); // State should only be used once
    Logger.logInfo(`State ${receivedState} verified successfully.`);
    // --- End State Verification ---

    // --- 2. Exchange Code for Token ---
    const params = new URLSearchParams({
        client_id: config.github.clientId || '',
        client_secret: config.github.clientSecret || '',
        code: code,
        redirect_uri: config.github.callbackUrl || '',
    });

    try {
        Logger.logInfo(`POSTing to ${GITHUB_TOKEN_URL} to get access token...`);
        const response = await fetch(GITHUB_TOKEN_URL, {
            method: 'POST',
            headers: {
                'Accept': 'application/json', // Request JSON response
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params.toString(),
        });

        const data: any = await response.json();

        if (!response.ok || data.error) {
            Logger.logError(`GitHub token exchange error (${response.status}): ${data.error} - ${JSON.stringify(data)}`);
            throw new Error(data.error_description || 'Failed to exchange code for token');
        }

        if (!data.access_token) {
            Logger.logError(data);
            throw new Error('GitHub response did not include access_token');
        }

        Logger.logInfo(`Successfully received access token. Scopes: ${data.scope}`);
        Logger.logInfo(`Received access token: ${data}`);
        const token = data.access_token as string;
        if (token) {
            SessionCookieStore.createSession(token);
            sessionCookie.set("scopes", data.scope?.split(',') || []);
        }
        const githubUser = await getGitHubUserDetails(data.access_token);
        if (githubUser) {
            sessionCookie.set("githubUserId", githubUser.id.toString());
        }


        return {
            accessToken: data.access_token,
            grantedScopes: data.scope?.split(/[\s,]+/) || [], // Split by space or comma
        };

    } catch (error: any) {
        Logger.logError(`Error exchanging code for token: ${error.message}}`);
        return null;
    }
}

/** Fetches GitHub user details using an access token */
export async function getGitHubUserDetails(accessToken: string): Promise<{ login: string; id: number; email?: string;[key: string]: any } | null> {
    Logger.logInfo('Fetching GitHub user details from API...');
    try {
        const response = await fetch(GITHUB_USER_API_URL, {
            headers: {
                'Authorization': `token ${accessToken}`,
                'Accept': 'application/vnd.github.v3+json',
            },
        });
        if (!response.ok) {
            const errorData = await response.json();
            Logger.logError(`GitHub API error fetching user (${response.status} ${errorData}`);
            throw new Error(`Failed to fetch GitHub user details. Status: ${response.status}`);
        }
        const userData = await response.json();
        Logger.logInfo(`Fetched GitHub user: ${userData.login} (ID: ${userData.id})`);
        return userData;
    } catch (error: any) {
        Logger.logError(`Error fetching GitHub user details:  ${error.message}`);
        return null;
    }
}


// --- Helper for cleaning up old states (for in-memory example) ---
function cleanupOldStates() {
    const now = Date.now();
    for (const [key, data] of stateStore.entries()) {
        if (now - data.timestamp > STATE_TTL_MS) {
            stateStore.delete(key);
            Logger.logInfo(`Removed expired state: ${key}`);
        }
    }
}
// In a real app, run this periodically or rely on session expiration
// setInterval(cleanupOldStates, STATE_TTL_MS);
// --- End Helper ---


// --- Function to get stored token (replace with secure session lookup) ---
export function getStoredTokenForSession(sessionId: string): string | null {
    // SessionCookieStore.createSession;
    return tokenStore.get(sessionId)?.accessToken || null;
}
// --- End Non-Production Token Retrieval ---
