import { NextRequest, NextResponse } from 'next/server';
import { validateForgeRequest } from '@/lib/auth/infrastructure/forgeAuth';
import { MongoOAuthTokenRepository } from '@/lib/auth/infrastructure/repositories/OAuthTokenRepository.mongo';

export async function POST(req: NextRequest, res: NextResponse) {
    const { isValid, error } = validateForgeRequest(req, res);
    if (!isValid) return error!;

    const body = await req.json().catch(() => ({}));
    const { accountId, cloudId, clientKey } = body;

    if (!accountId || !cloudId) {
        return new NextResponse('Missing accountId or cloudId in request body', { status: 400 });
    }

    try {
        const tokenRepo = new MongoOAuthTokenRepository();

        // Query oauthtokens directly by atlassianAccountId + cloudId.
        // This bypasses the fragile two-step userId indirection via userjirasite access
        // which can fail when storeUserSiteAccess throws during the OAuth callback.
        const oauthToken = await tokenRepo.findByAtlassianAccountIdAndCloudId(
            accountId,
            cloudId,
            'git',
            'github'
        );

        if (!oauthToken) {
            console.log(`Forge github status: No GitHub token found for atlassianAccountId=${accountId}, cloudId=${cloudId}`);
            return NextResponse.json({ connected: false });
        }

        const isExpired = oauthToken.expiresAt && oauthToken.expiresAt.getTime() <= Date.now();
        if (isExpired) {
            console.log(`Forge github status: GitHub token expired for atlassianAccountId=${accountId}`);
            return NextResponse.json({ connected: false });
        }

        console.log(`Forge github status: connected=true for atlassianAccountId=${accountId}`);
        return NextResponse.json({ connected: true });
    } catch (e: any) {
        console.error('Forge github status check failed:', e);
        return NextResponse.json({ connected: false, error: e.message }, { status: 500 });
    }
}
