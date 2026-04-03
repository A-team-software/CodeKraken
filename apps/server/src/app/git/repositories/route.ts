import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { AuthService } from '@oliver/auth';
import { GetRepositoriesUseCase } from '@oliver/git';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const provider = searchParams.get('provider') || 'github';
        const page = parseInt(searchParams.get('page') || '1');
        const perPage = parseInt(searchParams.get('perPage') || '30');

        const authService = AuthService.getInstance();
        const authData = await authService.getValidTokenAndUserFromRequest(cookies, request, provider, 'git');

        if (!authData) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const useCase = new GetRepositoriesUseCase();
        const repositories = await useCase.execute({
            providerType: provider,
            token: authData.accessToken,
            page,
            perPage
        });

        return NextResponse.json(repositories);
    } catch (error: any) {
        console.error('Failed to fetch repositories:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch repositories' },
            { status: 500 }
        );
    }
}
