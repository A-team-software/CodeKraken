import { NextRequest, NextResponse } from 'next/server';
import { MongoOAuthTokenRepository, validateForgeRequest } from '@oliver/auth';
import { GetRepositoriesUseCase } from '@oliver/git';

export async function GET(req: NextRequest) {
    const { isValid, error, status } = validateForgeRequest(req);
    if (!isValid) return new NextResponse(error!, { status: status || 400 });

    const accountId = req.headers.get('X-Forge-Account-Id');
    const cloudId = req.headers.get('X-Forge-Client-Key');
    const { searchParams } = new URL(req.url);
    const provider = searchParams.get('provider') || 'github';

    if (!accountId || !cloudId) {
        return NextResponse.json({ error: 'Missing X-Forge-Account-Id or X-Forge-Client-Key headers' }, { status: 400 });
    }

    try {
        const tokenRepo = new MongoOAuthTokenRepository();

        // Match the strategy used in getGithubStatus: bypassing user indirection.
        const oauthToken = await tokenRepo.findByAtlassianAccountIdAndCloudId(
            accountId,
            cloudId,
            'git',
            provider
        );

        if (!oauthToken) {
            return NextResponse.json({ error: `No connected ${provider} account found` }, { status: 404 });
        }

        const useCase = new GetRepositoriesUseCase();
        const repos = await useCase.execute({
            providerType: provider,
            token: oauthToken.accessToken
        });

        // The Jira Forge frontend specifically looks for: { repositories: [...] }
        return NextResponse.json({ repositories: repos });
    } catch (e: any) {
        console.error('Forge get repositories failed:', e);
        return NextResponse.json({ error: e.message || 'Failed to fetch repositories' }, { status: 500 });
    }
}
