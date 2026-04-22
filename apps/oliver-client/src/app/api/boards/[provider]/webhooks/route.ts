import { NextRequest, NextResponse } from 'next/server';
import { BoardProviderFactory } from '@/lib/board/infrastructure/external/BoardProviderFactory';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ provider: string }> }
) {
    try {
        const { provider } = await params;
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
        const webhooks = await boardProvider.getWebhooks(boardId);

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
        const { provider } = await params;
        const token = request.headers.get('authorization')?.replace('Bearer ', '');

        if (!token) {
            return NextResponse.json({ error: 'No authorization token provided' }, { status: 401 });
        }

        const body = await request.json();
        const { boardId, url, events, active } = body;

        if (!boardId || !url || !events) {
            return NextResponse.json(
                { error: 'boardId, url, and events are required' },
                { status: 400 }
            );
        }

        const boardProvider = BoardProviderFactory.create(provider, token);
        const webhook = await boardProvider.createWebhook(boardId, {
            url,
            events,
            active: active ?? true,
        });

        return NextResponse.json({ webhook }, { status: 201 });
    } catch (error: any) {
        console.error('Error creating webhook:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to create webhook' },
            { status: error.code === 'AUTH_FAILED' ? 401 : 500 }
        );
    }
}
