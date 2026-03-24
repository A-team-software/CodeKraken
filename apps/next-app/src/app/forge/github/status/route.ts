import { NextRequest, NextResponse } from 'next/server';
import { MongoConnectionManager } from '@/lib/infrastructure/db/mongodb/client';

import { validateForgeRequest } from '@/lib/auth/infrastructure/forgeAuth';

export async function POST(req: NextRequest) {
    const { isValid, error } = validateForgeRequest(req);
    if (!isValid) return error!;

    const { accountId, cloudId, clientKey } = await req.json();
    if (!accountId || !cloudId || !clientKey) {
        return new NextResponse('Missing accountId, cloudId or clientKey in request body', { status: 400 });
    }

    try {
        const { AtlassianConnectService } = await import('@/lib/application/services/AtlassianConnectService');
        const { MongoOAuthTokenRepository } = await import('@/lib/auth/infrastructure/repositories/OAuthTokenRepository.mongo');
        
        const atlassianService = new AtlassianConnectService();
        const userId = await atlassianService.getUserIdByAtlassianAccountId(accountId);

        if (!userId) {
            console.log(`Forge github status: No system userId found for atlassianAccountId: ${accountId}`);
            return NextResponse.json({ connected: false });
        }

        const tokenRepo = new MongoOAuthTokenRepository();
        const tokens = await tokenRepo.findByUser(userId);

        const githubToken = tokens.find(t => 
            t.provider === 'github' && 
            t.providerType === 'git' &&
            t.atlassianAccountId === accountId &&
            t.cloudId === cloudId &&
            t.clientKey === clientKey
        );

        if (!githubToken) {
            console.log(`Forge github status: No GitHub token found for userId: ${userId}`);
            return NextResponse.json({ connected: false });
        }

        const isExpired = githubToken.expiresAt && githubToken.expiresAt.getTime() <= Date.now();
        if (isExpired) {
            console.log(`Forge github status: GitHub token expired for userId: ${userId}`);
            return NextResponse.json({ connected: false });
        }

        return NextResponse.json({ connected: true });
    } catch (e: any) {
        console.error('Forge github status check failed:', e);
        return NextResponse.json({ connected: false, error: e.message }, { status: 500 });
    }
}
