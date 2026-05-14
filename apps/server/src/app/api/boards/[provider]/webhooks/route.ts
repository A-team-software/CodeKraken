import { NextRequest } from 'next/server';
import { BoardProviderFactory } from '@oliver/boards';
import { SafeExecute } from '@oliver/core/src/errors';
import { ApiRes } from '@/utils/api_response';
import { wrapRoute } from '@/utils/api_handler';

export const GET = wrapRoute(async (request: NextRequest, params: Promise<{ provider: string }>) => {
    const [paramsResult, paramsError] = await SafeExecute.withSync(async () => params).execute();
    if (paramsError || !paramsResult) return ApiRes.badRequest(paramsError?.message || 'Invalid params');
    const { provider } = paramsResult;
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

export const POST = wrapRoute(async (request: NextRequest, params: Promise<{ provider: string }>) => {
    const [paramsResult, paramsError] = await SafeExecute.withSync(async () => params).execute();
    if (paramsError || !paramsResult) return ApiRes.badRequest(paramsError?.message || 'Invalid params');
    const { provider } = paramsResult;
    const token = request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
        return ApiRes.unauthorized('No authorization token provided');
    }

    const [body, bodyError] = await SafeExecute.withSync(async () => request.json()).execute();
    if (bodyError || !body) return ApiRes.badRequest(bodyError?.message || 'Invalid request body');
    const { boardId, url, events, active } = body;

    if (!boardId || !url || !events) {
        return ApiRes.badRequest('boardId, url, and events are required');
    }

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
