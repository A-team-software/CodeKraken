import { NextRequest } from 'next/server';
import { BoardProviderFactory } from '@oliver/boards';
import { SafeExecute } from '@oliver/core/src/errors';
import { ApiRes } from '@/utils/api_response';
import { wrapRoute } from '@/utils/api_handler';
import { z } from 'zod';

export const GET = wrapRoute({
    paramsSchema: z.object({ provider: z.string() })
}, async (request, ctx) => {
    const { provider } = ctx.params;
    const token = request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
        return ApiRes.unauthorized('No authorization token provided');
    }

    const boardProvider = BoardProviderFactory.create(provider, token);
    const [boards, boardsError] = await SafeExecute.withSync(async () => boardProvider.getBoards()).execute();
    if (boardsError) {
        const status = (boardsError as any).code === 'AUTH_FAILED' ? 401 : 500;
        return ApiRes.error(boardsError.message || 'Failed to fetch boards', 'BOARD_ERROR', status);
    }

    return { boards };
});
