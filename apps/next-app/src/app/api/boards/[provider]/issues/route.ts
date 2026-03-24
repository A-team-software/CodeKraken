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
        const status = searchParams.get('status')?.split(',');
        const assignee = searchParams.get('assignee');
        const type = searchParams.get('type')?.split(',');
        const search = searchParams.get('search');

        const token = request.headers.get('authorization')?.replace('Bearer ', '');

        if (!token) {
            return NextResponse.json({ error: 'No authorization token provided' }, { status: 401 });
        }

        if (!boardId) {
            return NextResponse.json({ error: 'boardId query parameter is required' }, { status: 400 });
        }

        const boardProvider = BoardProviderFactory.create(provider, token);
        const issues = await boardProvider.getIssues(boardId, {
            status,
            assignee: assignee || undefined,
            type,
            search: search || undefined,
        });

        return NextResponse.json({ issues });
    } catch (error: any) {
        console.error('Error fetching issues:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch issues' },
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
        const { boardId, summary, description, type, priority, assignee, labels } = body;

        if (!boardId || !summary || !type) {
            return NextResponse.json(
                { error: 'boardId, summary, and type are required' },
                { status: 400 }
            );
        }

        const boardProvider = BoardProviderFactory.create(provider, token);
        const issue = await boardProvider.createIssue(boardId, {
            summary,
            description,
            type,
            priority,
            assignee,
            labels,
        });

        return NextResponse.json({ issue }, { status: 201 });
    } catch (error: any) {
        console.error('Error creating issue:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to create issue' },
            { status: error.code === 'AUTH_FAILED' ? 401 : 500 }
        );
    }
}
