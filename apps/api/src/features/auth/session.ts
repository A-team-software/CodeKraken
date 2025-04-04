import crypto from 'crypto'; // For generating 'state'


// sessionStore.ts
import { randomUUID } from 'crypto';
import { CookieMap } from 'bun';
import { SafeExecute } from '@oliver/utils';
import { Logger } from '@oliver/utils';





export type SessionData = {
    userId?: string;
    accessToken?: string; // Store the access token here
    sessionId: string; // Optional, for convenience
    createdAt?: number; // For TTL check
    [key: string]: any; // Allow other data
}


export let sessionCookie: CookieMap;
const setSession = (sessionData: SessionData) => {
    console.log({ ...sessionData });
    new CookieMap({
        sessionId: sessionData.sessionId,
        createdAt: Date.now().toString(),
    })
};


const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds


function createSession(token: string): CookieMap {
    const sessionId = crypto.randomBytes(16).toString('hex'); // Example session ID
    ({
        sessionId: sessionId,
        accessToken: token,
    })

    // From an object
    sessionCookie = new Bun.CookieMap({
        sessionId: sessionId,
        createdAt: Date.now().toString(),
    });
    return sessionCookie;
}

function getSession(sessionId: string): SessionData | null {
    const [sessionData, error] = SafeExecute.noSync(sessionCookie.get, sessionId);
    if (sessionData == null) {
        Logger.logInfo(`Session not found ${sessionData}`);
        return null;
    }

    if (error) {
        Logger.logInfo(`Failed Session ${sessionId}: ${error}`);
        return null;
    }

    const session = JSON.parse(sessionData) as SessionData;


    // Basic TTL check
    if (session.createdAt && (Date.now() - session.createdAt > SESSION_TTL_MS)) {
        Logger.logInfo(`[Session Store] Session ${sessionId} accessed after TTL, deleting.`);
        sessionCookie.delete(sessionId);
        return null;
    }

    Logger.logInfo(`[Session Store] Retrieved session ${sessionId}`);
    // Return a copy including the ID
    return session;
}

// Function to update/save session data
async function saveSession(sessionId: string, data: SessionData): Promise<void> {
    // Ensure internal fields like createdAt are preserved if needed

    const existingData = sessionCookie.get(sessionId) ?? {};
    const newData: SessionData = { ...existingData, ...data }; // Merge new data over existing
    new CookieMap(newData);
    Logger.logInfo(`[Session Store] Saved session ${sessionId}`);
}


async function destroySession(sessionId: string): Promise<void> {
    sessionCookie.delete(sessionId);
    Logger.logInfo(`[Session Store] Destroyed session ${sessionId}`);
}



const SessionCookieStore = {
    createSession: createSession,
    getSession: getSession,
    saveSession: saveSession,
    destroySession: destroySession,
} as const;


export default SessionCookieStore;
