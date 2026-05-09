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
        
        // Delete by Atlassian identifiers directly - this is the most reliable way for Forge flows
        const [deleted, deleteError] = await SafeExecute.withSync(async () => 
            tokenRepo.deleteByAtlassianAccountIdAndCloudId(accountId, cloudId, 'git', provider)
        ).execute();

        if (deleteError) {
            console.error('Forge github disconnect deletion failed:', deleteError);
            return NextResponse.json({ success: false, error: deleteError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, deleted });
    } catch (e: any) {
        console.error('Forge github disconnect failed:', e);
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
