import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { MongoConnectionManager } from '@/lib/infrastructure/db/mongodb/client';
import crypto from 'crypto';

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

async function exchangeCodeForToken(code: string) {
    const res = await fetch('https://github.com/login/oauth/access_token', {
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
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error_description || data.error);
    return data.access_token;
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code || !state) {
        return new NextResponse('Missing code or state', { status: 400 });
    }

    try {
        const payload = jwt.verify(state, stateSecret) as { accountId: string };
        const { accountId } = payload;

        const token = await exchangeCodeForToken(code);

        const db = await MongoConnectionManager.getDb();
        
        await db.collection('users').updateOne(
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
        );

        const html = `
            <script>
                window.opener.postMessage({ type: 'GITHUB_CONNECTED' }, "*");
                window.close();
            </script>
        `;
        return new NextResponse(html, { headers: { 'Content-Type': 'text/html' }});
    } catch (error: any) {
        console.error('Github callback error:', error);
        return new NextResponse(`Error: ${error.message}`, { status: 400 });
    }
}
