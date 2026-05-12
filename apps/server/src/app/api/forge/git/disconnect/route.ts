import { validateForgeRequest } from '@oliver/auth';
import { NextRequest, NextResponse } from 'next/server';
import { SafeExecute } from '@oliver/core/src/errors';

export async function POST(req: NextRequest) {
    const { isValid, error } = validateForgeRequest(req);
    if (!isValid) return NextResponse.json({ error: error }, { status: 401 });

    const [body, bodyError] = await SafeExecute.withSync(async () => req.json()).execute();
    if (bodyError || !body) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    const accountId = body.accountId;
    const cloudId = body.cloudId || body.clientKey;

    const provider = body.provider;

    if (!accountId || !cloudId) {
        return NextResponse.json({ error: 'Missing accountId or cloudId' }, { status: 400 });
    }

    try {
        const [auth, importAuthError] = await SafeExecute.withSync(async () => import('@oliver/auth')).execute();
        if (importAuthError || !auth) return NextResponse.json({ error: importAuthError?.message || 'Failed to import auth module' }, { status: 500 });
        const { MongoOAuthTokenRepository } = auth;

        const tokenRepo = new MongoOAuthTokenRepository();

        // Invalidate by Atlassian identifiers - sets tokens to null instead of deleting record
        const [invalidated, invalidateError] = await SafeExecute.withSync(async () =>
            tokenRepo.invalidateByAtlassianAccountIdAndCloudId(accountId, cloudId, 'git', provider)
        ).execute();

        if (invalidateError) {
            console.error('Forge git disconnect invalidation failed:', invalidateError);
            return NextResponse.json({ success: false, error: invalidateError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, invalidated });
    } catch (e: any) {
        console.error('Forge github disconnect failed:', e);
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
