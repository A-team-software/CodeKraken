import { validateForgeRequest } from '@oliver/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    const result = validateForgeRequest(req);
    if (!result.isValid) return new NextResponse(result.error!, { status: result.status || 400 });

    const { accountId } = await req.json();
    if (!accountId) {
        return new NextResponse('Missing accountId', { status: 400 });
    }

    try {
        const { AtlassianConnectService } = await import('@oliver/application');
        const { MongoOAuthTokenRepository } = await import('@oliver/auth');

        const atlassianService = new AtlassianConnectService();
        const userId = await atlassianService.getUserIdByAtlassianAccountId(accountId);

        if (!userId) {
            return NextResponse.json({ success: true, message: 'User not found, already disconnected' });
        }

        const tokenRepo = new MongoOAuthTokenRepository();
        await tokenRepo.deleteByUserAndProvider(userId, 'github', 'git');

        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error('Forge github disconnect failed:', e);
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
