import { validateForgeRequest } from '@oliver/auth';
import { NextRequest, NextResponse } from 'next/server';
import { SafeExecute } from '@oliver/core/src/errors';

export async function POST(req: NextRequest) {
    const { isValid, error } = validateForgeRequest(req);
    if (!isValid) return NextResponse.json({ error: error }, { status: 401 });

    const [body, bodyError] = await SafeExecute.withSync(async () => req.json()).execute();
    if (bodyError || !body) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    const accountId = body.accountId;

    if (!accountId) {
        return NextResponse.json({ error: 'Missing accountId' }, { status: 400 });
    }

    try {
        const [application, importAppError] = await SafeExecute.withSync(async () => import('@oliver/application')).execute();
        if (importAppError || !application) return NextResponse.json({ error: importAppError?.message || 'Failed to import application module' }, { status: 500 });
        const { AtlassianConnectService } = application;

        const [auth, importAuthError] = await SafeExecute.withSync(async () => import('@oliver/auth')).execute();
        if (importAuthError || !auth) return NextResponse.json({ error: importAuthError?.message || 'Failed to import auth module' }, { status: 500 });
        const { MongoOAuthTokenRepository } = auth;

        const atlassianService = new AtlassianConnectService();
        const [userId, userIdError] = await SafeExecute.withSync(async () => 
            atlassianService.getUserIdByAtlassianAccountId(accountId)
        ).execute();

        if (userIdError) return NextResponse.json({ error: userIdError.message || 'Failed to look up user' }, { status: 500 });

        if (!userId) {
            return NextResponse.json({ success: true, message: 'User not found, already disconnected' });
        }

        const tokenRepo = new MongoOAuthTokenRepository();
        const [_, deleteError] = await SafeExecute.withSync(async () => 
            tokenRepo.deleteByUserAndProvider(userId, 'github', 'git')
        ).execute();

        if (deleteError) return NextResponse.json({ success: false, error: deleteError.message }, { status: 500 });

        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error('Forge github disconnect failed:', e);
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
