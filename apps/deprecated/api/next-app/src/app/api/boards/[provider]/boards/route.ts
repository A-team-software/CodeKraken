import { NextRequest, NextResponse } from 'next/server';
import { BoardProviderFactory } from '@/lib/board/infrastructure/external/BoardProviderFactory';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ provider: string }> }
) {
    try {
        const { provider } = await params;
        const token = request.headers.get('authorization')?.replace('Bearer ', '');

        if (!token) {
            return NextResponse.json({ error: 'No authorization token provided' }, { status: 401 });
        }

        const boardProvider = BoardProviderFactory.create(provider, token);
        const boards = await boardProvider.getBoards();

        return NextResponse.json({ boards });
    } catch (error: any) {
        console.error('Error fetching boards:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch boards' },
            { status: error.code === 'AUTH_FAILED' ? 401 : 500 }
        );
    }
}
