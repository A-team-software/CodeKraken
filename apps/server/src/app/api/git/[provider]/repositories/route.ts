import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { GetRepositoriesUseCase } from '@oliver/git';
import { AuthService } from '@oliver/auth';
import { SafeExecute } from '@oliver/core/src/errors';
import { Logger } from '@oliver/core';
import { ApiRes } from '@/utils/api_response';
import { wrapRoute } from '@/utils/api_handler';

/**
 * GET /api/git/[provider]/repositories
 * Get repositories for authenticated git provider.
 * Supports web (cookies), Forge (headers), and direct Bearer tokens.
 */
export const GET = wrapRoute(async (request: NextRequest, params: Promise<{ provider: string }>) => {
    const [paramsResult, paramsError] = await SafeExecute.withSync(async () => params).execute();
    if (paramsError || !paramsResult) return ApiRes.badRequest(paramsError?.message || 'Invalid params');
    const { provider } = paramsResult;

    // Resolve token using unified AuthService method
    const authService = AuthService.getInstance();
    const authData = await authService.resolveGitToken(request, cookies, provider);

    if (!authData) {
        return ApiRes.unauthorized(`No valid ${provider} connection found. Please authenticate.`);
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
        const status = (executeError as any).code === 'AUTH_FAILED' ? 401 : 502;
        return ApiRes.error(executeError.message || 'Failed to fetch repositories', 'PROVIDER_ERROR', status);
    }

    return { 
        repositories: repositories ?? [], 
        provider, 
        page, 
        perPage,
        workspace 
    };
});
