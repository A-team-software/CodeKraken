import { NextRequest, NextResponse } from 'next/server';
import { AuthenticateGitProviderUseCase } from '@oliver/git';
import { GitProviderError } from '@oliver/shared';
import { TOKEN_COOKIE_NAME } from '@oliver/auth';

/**
 * POST /api/providers/[type]
 * Authenticate with a git provider via a manually supplied token (legacy / PAT flow).
 * For OAuth-based auth, use GET /api/git/[provider]/oauth instead.
 * AssignedRepoSchema
 * Body: { token: "..." }
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ type: string }> }) {
    try {
        const { type } = await params;
        const { token } = await request.json();

        if (!token) {
            return NextResponse.json({ error: 'Token required' }, { status: 400 });
        }

        const useCase = new AuthenticateGitProviderUseCase();
        const result = await useCase.execute({ providerType: type, token });

        if (!result.success) {
            return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
        }

        const response = NextResponse.json({
            success: true,
            user: result.user,
            provider: type,
        });

        response.cookies.set({
            name: `${TOKEN_COOKIE_NAME}_${type}`,
            value: token,
            maxAge: 7 * 24 * 60 * 60,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
        });

        return response;
    } catch (error: any) {
        const message = error instanceof GitProviderError ? error.message : 'Authentication failed';
        return NextResponse.json(
            { error: message, code: error?.code || 'UNKNOWN' },
            { status: error instanceof GitProviderError && error.code === 'AUTH_FAILED' ? 401 : 500 }
        );
    }
}
