import { NextRequest, NextResponse } from 'next/server';
import { BoardProviderFactory } from '@oliver/boards';
import { SafeExecute } from '@oliver/core/src/errors';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ provider: string }> }
) {
    try {
        const [paramsResult, paramsError] = await SafeExecute.withSync(async () => params).execute();
        if (paramsError || !paramsResult) return NextResponse.json({ error: paramsError?.message || 'Invalid params' }, { status: 400 });
        const { provider } = paramsResult;
        const token = request.headers.get('authorization')?.replace('Bearer ', '');

        if (!token) {
            return NextResponse.json({ error: 'No authorization token provided' }, { status: 401 });
        }

        const boardProvider = BoardProviderFactory.create(provider, token);
        const [boards, boardsError] = await SafeExecute.withSync(async () => boardProvider.getBoards()).execute();
        if (boardsError) return NextResponse.json({ error: boardsError.message || 'Failed to fetch boards' }, { status: (boardsError as any).code === 'AUTH_FAILED' ? 401 : 500 });

        return NextResponse.json({ boards });
    } catch (error: any) {
        console.error('Error fetching boards:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch boards' },
            { status: error.code === 'AUTH_FAILED' ? 401 : 500 }
        );
    }
}
