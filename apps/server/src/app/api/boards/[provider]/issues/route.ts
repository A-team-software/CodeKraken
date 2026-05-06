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
        const [issues, issuesError] = await SafeExecute.withSync(async () => 
            boardProvider.getIssues(boardId, {
                status,
                assignee: assignee || undefined,
                type,
                search: search || undefined,
            })
        ).execute();

        if (issuesError) return NextResponse.json({ error: issuesError.message || 'Failed to fetch issues' }, { status: (issuesError as any).code === 'AUTH_FAILED' ? 401 : 500 });

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
        const [paramsResult, paramsError] = await SafeExecute.withSync(async () => params).execute();
        if (paramsError || !paramsResult) return NextResponse.json({ error: paramsError?.message || 'Invalid params' }, { status: 400 });
        const { provider } = paramsResult;
        const token = request.headers.get('authorization')?.replace('Bearer ', '');

        if (!token) {
            return NextResponse.json({ error: 'No authorization token provided' }, { status: 401 });
        }

        const [body, bodyError] = await SafeExecute.withSync(async () => request.json()).execute();
        if (bodyError || !body) return NextResponse.json({ error: bodyError?.message || 'Invalid request body' }, { status: 400 });
        const { boardId, summary, description, type, priority, assignee, labels } = body;

        if (!boardId || !summary || !type) {
            return NextResponse.json(
                { error: 'boardId, summary, and type are required' },
                { status: 400 }
            );
        }

        const boardProvider = BoardProviderFactory.create(provider, token);
        const [issue, issueError] = await SafeExecute.withSync(async () => 
            boardProvider.createIssue(boardId, {
                summary,
                description,
                type,
                priority,
                assignee,
                labels,
            })
        ).execute();

        if (issueError) return NextResponse.json({ error: issueError.message || 'Failed to create issue' }, { status: (issueError as any).code === 'AUTH_FAILED' ? 401 : 500 });

        return NextResponse.json({ issue }, { status: 201 });
    } catch (error: any) {
        console.error('Error creating issue:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to create issue' },
            { status: error.code === 'AUTH_FAILED' ? 401 : 500 }
        );
    }
}
