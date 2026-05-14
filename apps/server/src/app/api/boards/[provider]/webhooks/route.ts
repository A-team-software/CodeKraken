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
    const { searchParams } = new URL(request.url);
    const boardId = searchParams.get('boardId');

    const token = request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
        return ApiRes.unauthorized('No authorization token provided');
    }

    if (!boardId) {
        return ApiRes.badRequest('boardId query parameter is required');
    }

    const boardProvider = BoardProviderFactory.create(provider, token);
    const [webhooks, webhooksError] = await SafeExecute.withSync(async () => 
        boardProvider.getWebhooks(boardId)
    ).execute();

    if (webhooksError) {
        const status = (webhooksError as any).code === 'AUTH_FAILED' ? 401 : 500;
        return ApiRes.error(webhooksError.message || 'Failed to fetch webhooks', 'BOARD_ERROR', status);
    }

    return { webhooks };
});

export const POST = wrapRoute({
    paramsSchema: z.object({ provider: z.string() }),
    bodySchema: z.object({
        boardId: z.string(),
        url: z.string(),
        events: z.array(z.string()),
        active: z.boolean().optional()
    })
}, async (request, ctx) => {
    const { provider } = ctx.params;
    const token = request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
        return ApiRes.unauthorized('No authorization token provided');
    }

    const { boardId, url, events, active } = ctx.body;



    const boardProvider = BoardProviderFactory.create(provider, token);
    const [webhook, webhookError] = await SafeExecute.withSync(async () => 
        boardProvider.createWebhook(boardId, {
            url,
            events,
            active: active ?? true,
        })
    ).execute();

    if (webhookError) {
        const status = (webhookError as any).code === 'AUTH_FAILED' ? 401 : 500;
        return ApiRes.error(webhookError.message || 'Failed to create webhook', 'BOARD_ERROR', status);
    }

    return ApiRes.success({ webhook }, 201);
});
