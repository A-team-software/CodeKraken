import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { MongoConnectionManager } from '@oliver/db';
import { SafeExecute } from '@oliver/core/src/errors';

const stateSecret = process.env.OAUTH_STATE_SECRET || 'fallback_secret_for_dev_123';
const ENCRYPTION_KEY = crypto.createHash('sha256').update(String(stateSecret)).digest('base64').substr(0, 32);
const IV_LENGTH = 16;

function encrypt(text: string) {
    let iv = crypto.randomBytes(IV_LENGTH);
    let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

async function exchangeCodeForToken(code: string): Promise<[string | null, Error | null]> {
    const [res, resError] = await SafeExecute.withSync(async () =>
        fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                client_id: process.env.GITHUB_CLIENT_ID,
                client_secret: process.env.GITHUB_CLIENT_SECRET,
                code,
            }),
        })
    ).execute();

    if (resError || !res) return [null, resError || new Error('Failed to fetch token')];

    const [data, dataError] = await SafeExecute.withSync(async () => res.json()).execute();
    if (dataError || !data) return [null, dataError || new Error('Failed to parse token response')];

    if (data.error) return [null, new Error(data.error_description || data.error)];
    return [data.access_token, null];
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code || !state) {
        return NextResponse.json({ error: 'Missing code or state' }, { status: 400 });
    }

    try {
        const payload = jwt.verify(state, stateSecret) as { accountId: string };
        const { accountId } = payload;

        const [token, tokenError] = await exchangeCodeForToken(code);
        if (tokenError || !token) return NextResponse.json({ error: tokenError?.message || 'Failed to exchange code' }, { status: 400 });

        const [db, dbError] = await SafeExecute.withSync(async () => MongoConnectionManager.getDb()).execute();
        if (dbError || !db) return NextResponse.json({ error: dbError?.message || 'Failed to connect to database' }, { status: 500 });

        const [_, updateError] = await SafeExecute.withSync(async () => 
            db.collection('users').updateOne(
                { atlassianAccountId: accountId },
                {
                    $set: {
                        'integrations.github': {
                            accessToken: encrypt(token),
                            connectedAt: new Date()
                        }
                    }
                },
                { upsert: true }
            )
        ).execute();

        if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

        const html = `
            <script>
                window.opener.postMessage({ type: 'GITHUB_CONNECTED' }, "*");
                window.close();
            </script>
        `;
        return new NextResponse(html, { headers: { 'Content-Type': 'text/html' } });
    } catch (error: any) {
        console.error('Github callback error:', error);
        return NextResponse.json({ error: error.message || 'GitHub OAuth callback failed' }, { status: 400 });
    }
}
