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
        const { searchParams } = new URL(request.url);
        const boardId = searchParams.get('boardId');

        const token = request.headers.get('authorization')?.replace('Bearer ', '');

        if (!token) {
            return NextResponse.json({ error: 'No authorization token provided' }, { status: 401 });
        }

        if (!boardId) {
            return NextResponse.json({ error: 'boardId query parameter is required' }, { status: 400 });
        }

        const boardProvider = BoardProviderFactory.create(provider, token);
        const [webhooks, webhooksError] = await SafeExecute.withSync(async () => 
            boardProvider.getWebhooks(boardId)
        ).execute();

        if (webhooksError) return NextResponse.json({ error: webhooksError.message || 'Failed to fetch webhooks' }, { status: (webhooksError as any).code === 'AUTH_FAILED' ? 401 : 500 });

        return NextResponse.json({ webhooks });
    } catch (error: any) {
        console.error('Error fetching webhooks:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch webhooks' },
            { status: error.code === 'AUTH_FAILED' ? 401 : 500 }
        );
    }
}

export async function POST(
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

        const [body, bodyError] = await SafeExecute.withSync(async () => request.json()).execute();
        if (bodyError || !body) return NextResponse.json({ error: bodyError?.message || 'Invalid request body' }, { status: 400 });
        const { boardId, url, events, active } = body;

        if (!boardId || !url || !events) {
            return NextResponse.json(
                { error: 'boardId, url, and events are required' },
                { status: 400 }
            );
        }

        const boardProvider = BoardProviderFactory.create(provider, token);
        const [webhook, webhookError] = await SafeExecute.withSync(async () => 
            boardProvider.createWebhook(boardId, {
                url,
                events,
                active: active ?? true,
            })
        ).execute();

        if (webhookError) return NextResponse.json({ error: webhookError.message || 'Failed to create webhook' }, { status: (webhookError as any).code === 'AUTH_FAILED' ? 401 : 500 });

        return NextResponse.json({ webhook }, { status: 201 });
    } catch (error: any) {
        console.error('Error creating webhook:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to create webhook' },
            { status: error.code === 'AUTH_FAILED' ? 401 : 500 }
        );
    }
}
