import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { GetRepositoriesUseCase } from '@oliver/git';
import { AuthService } from '@oliver/auth';
import { SafeExecute } from '@oliver/core/src/errors';
import { Logger } from '@oliver/core';

/**
 * GET /api/git/[provider]/repositories
 * Get repositories for authenticated git provider.
 * Supports web (cookies), Forge (headers), and direct Bearer tokens.
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ provider: string }> }
) {
    try {
        const [paramsResult, paramsError] = await SafeExecute.withSync(async () => params).execute();
        if (paramsError || !paramsResult) return NextResponse.json({ error: paramsError?.message || 'Invalid params' }, { status: 400 });
        const { provider } = paramsResult;

        // Resolve token using unified AuthService method
        const authService = AuthService.getInstance();
        const authData = await authService.resolveGitToken(request, cookies, provider);

        if (!authData) {
            return NextResponse.json(
                { error: `No valid ${provider} connection found. Please authenticate.` },
                { status: 401 }
            );
        }

        const { searchParams } = request.nextUrl;
        const page = parseInt(searchParams.get('page') || '1', 10);
        const perPage = parseInt(searchParams.get('perPage') || '30', 10);
        const workspace = searchParams.get('workspace') || undefined;

        const useCase = new GetRepositoriesUseCase();
        const [repositories, executeError] = await SafeExecute.withSync(async () => 
            useCase.execute({ 
                providerType: provider, 
                token: authData.token, 
                page, 
                perPage,
                workspace
            })
        ).execute();

        if (executeError) {
            Logger.error(`Failed to fetch repositories for ${provider}:`, executeError);
            return NextResponse.json(
                { error: executeError.message || 'Failed to fetch repositories' }, 
                { status: (executeError as any).code === 'AUTH_FAILED' ? 401 : 502 }
            );
        }

        return NextResponse.json({ 
            repositories: repositories ?? [], 
            provider, 
            page, 
            perPage,
            workspace 
        });
    } catch (error: any) {
        Logger.error(`Unexpected error in /api/git/[provider]/repositories:`, error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
