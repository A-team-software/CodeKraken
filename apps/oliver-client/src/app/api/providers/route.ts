import { NextResponse } from 'next/server';
import { ListGitProvidersUseCase } from '@/lib/git/application/use_cases/ListGitProvidersUseCase';

/**
 * GET /api/providers - List all available providers
 */
export async function GET() {
    try {
        const useCase = new ListGitProvidersUseCase();
        const providers = await useCase.execute();

        return NextResponse.json({ providers });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch providers' }, { status: 500 });
    }
}
