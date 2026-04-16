import { validateForgeRequest } from '@oliver/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    const result = validateForgeRequest(req);
    if (!result.isValid) return new NextResponse(result.error!, { status: result.status || 400 });

    const body = await req.json().catch(() => ({}));
    const { accountId, cloudId, clientKey } = body;

    if (!accountId || !cloudId) {
        return new NextResponse('Missing accountId or cloudId in request body', { status: 400 });
    }

    try {
        const { MongoOAuthTokenRepository } = await import('@oliver/auth');

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
            return NextResponse.json({ connected: false, message: `Forge github status: No GitHub token found for atlassianAccountId=${accountId}, cloudId=${cloudId}` });
        }

        const isExpired = oauthToken.expiresAt && oauthToken.expiresAt.getTime() <= Date.now();
        if (isExpired) {
            return NextResponse.json({ connected: false, message: `Forge github status: GitHub token expired for atlassianAccountId=${accountId}` });
        }


        return NextResponse.json({ connected: true, message: `Forge github status: connected=true for atlassianAccountId=${accountId}` });
    } catch (e: any) {
        console.error('Forge github status check failed:', e);
        return NextResponse.json({ connected: false, error: e.message }, { status: 500 });
    }
}
