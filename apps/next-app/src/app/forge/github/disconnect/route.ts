import { NextRequest, NextResponse } from 'next/server';
import { validateForgeRequest } from '@/lib/auth/infrastructure/forgeAuth';

export async function POST(req: NextRequest) {
    const { isValid, error } = validateForgeRequest(req);
    if (!isValid) return error!;

    const { accountId } = await req.json();
    if (!accountId) {
        return new NextResponse('Missing accountId', { status: 400 });
    }

    try {
        const { AtlassianConnectService } = await import('@/lib/application/services/AtlassianConnectService');
        const { MongoOAuthTokenRepository } = await import('@/lib/auth/infrastructure/repositories/OAuthTokenRepository.mongo');
        
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
