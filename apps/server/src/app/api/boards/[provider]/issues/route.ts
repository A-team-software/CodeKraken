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
    const status = searchParams.get('status')?.split(',');
    const assignee = searchParams.get('assignee');
    const type = searchParams.get('type')?.split(',');
    const search = searchParams.get('search');

    const token = request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
        return ApiRes.unauthorized('No authorization token provided');
    }

    if (!boardId) {
        return ApiRes.badRequest('boardId query parameter is required');
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

    if (issuesError) {
        const status = (issuesError as any).code === 'AUTH_FAILED' ? 401 : 500;
        return ApiRes.error(issuesError.message || 'Failed to fetch issues', 'BOARD_ERROR', status);
    }

    return { issues };
});

export const POST = wrapRoute({
    paramsSchema: z.object({ provider: z.string() }),
    bodySchema: z.object({
        boardId: z.string(),
        summary: z.string(),
        description: z.string().optional(),
        type: z.string(),
        priority: z.string().optional(),
        assignee: z.string().optional(),
        labels: z.array(z.string()).optional()
    })
}, async (request, ctx) => {
    const { provider } = ctx.params;
    const token = request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
        return ApiRes.unauthorized('No authorization token provided');
    }

    const { boardId, summary, description, type, priority, assignee, labels } = ctx.body;



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

    if (issueError) {
        const status = (issueError as any).code === 'AUTH_FAILED' ? 401 : 500;
        return ApiRes.error(issueError.message || 'Failed to create issue', 'BOARD_ERROR', status);
    }

    return ApiRes.success({ issue }, 201);
});
