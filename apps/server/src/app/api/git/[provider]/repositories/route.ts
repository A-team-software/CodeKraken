import { NextRequest, NextResponse } from 'next/server';
import { GetRepositoriesUseCase } from '@oliver/git';
import { TOKEN_COOKIE_NAME } from '@oliver/auth';

/**
 * GET /api/git/[provider]/repositories
 * Get repositories for authenticated git provider.
 *
 * Auth methods (in priority order):
 * 1. Authorization: Bearer <token> header
 * 2. HttpOnly cookie set by OAuth callback (git_provider_token_git_<provider>)
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ provider: string }> }
) {
    try {
        const { provider } = await params;

        // Try Bearer header first, then fall back to OAuth cookie
        let token = request.headers.get('authorization')?.replace('Bearer ', '')
            || request.headers.get('x-provider-token')
            || request.cookies.get(`${TOKEN_COOKIE_NAME}_git_${provider}`)?.value
            || null;

        if (!token) {
            return NextResponse.json(
                { error: 'No authorization token provided (header: Authorization / x-provider-token, or OAuth cookie)' },
                { status: 401 }
            );
        }

        const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
        const perPage = parseInt(request.nextUrl.searchParams.get('perPage') || '30');

        const useCase = new GetRepositoriesUseCase();
        const repositories = await useCase.execute({ providerType: provider, token, page, perPage });

        return NextResponse.json({ repositories, provider, page, perPage });
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Failed to fetch repositories' },
            { status: error.code === 'AUTH_FAILED' ? 401 : 500 }
        );
    }
}
