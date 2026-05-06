import { NextResponse } from 'next/server';
import { ListGitProvidersUseCase } from '@oliver/git';
import { SafeExecute } from '@oliver/core/src/errors';

/**
 * GET /api/providers - List all available providers
 */
export async function GET() {
    try {
        const useCase = new ListGitProvidersUseCase();
        const [providers, error] = await SafeExecute.withSync(async () =>
            useCase.execute()
        ).execute();

        if (error) return NextResponse.json({ error: error.message || 'Failed to fetch providers' }, { status: 500 });

        return NextResponse.json({ providers });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch providers' }, { status: 500 });
    }
}
