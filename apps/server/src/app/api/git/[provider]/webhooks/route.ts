import { NextRequest } from 'next/server';
import { GitProviderFactory } from '@oliver/git';
import { SafeExecute } from '@oliver/core/src/errors';
import { ApiRes } from '@/utils/api_response';
import { wrapRoute } from '@/utils/api_handler';

export const GET = wrapRoute(async (request: NextRequest, params: Promise<{ provider: string }>) => {
    const [paramsResult, paramsError] = await SafeExecute.withSync(async () => params).execute();
    if (paramsError || !paramsResult) return ApiRes.badRequest(paramsError?.message || 'Invalid params');
    const { provider } = paramsResult;
    const { searchParams } = new URL(request.url);
    const repoId = searchParams.get('repoId');
    const owner = searchParams.get('owner');
    const slug = searchParams.get('slug');

    const token = request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
        return ApiRes.unauthorized('No authorization token provided');
    }

    if (!repoId && (!owner || !slug)) {
        return ApiRes.badRequest('Either repoId or owner+slug query parameters are required');
    }

    const gitProvider = GitProviderFactory.create(provider, token);

    // Build a minimal UnifiedRepository object for the webhook methods
    const repo = {
        id: repoId || '',
        owner: owner || '',
        slug: slug || '',
        name: slug || '',
        fullName: `${owner}/${slug}`,
        description: null,
        isPrivate: false,
        htmlUrl: '',
        language: null,
        defaultBranch: 'main',
        updatedAt: '',
        stats: {},
        permissions: { admin: false, push: false, pull: false },
    };

    const [webhooks, webhooksError] = await SafeExecute.withSync(async () => 
        gitProvider.getWebhooks(repo as any)
    ).execute();

    if (webhooksError) {
        const status = (webhooksError as any).code === 'AUTH_FAILED' ? 401 : 500;
        return ApiRes.error(webhooksError.message || 'Failed to fetch webhooks', 'WEBHOOK_ERROR', status);
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
    const { repoId, owner, slug, url, events, active, secret, contentType, insecureSsl } = body;

    if (!owner || !slug || !url || !events) {
        return ApiRes.badRequest('owner, slug, url, and events are required');
    }

    const gitProvider = GitProviderFactory.create(provider, token);

    const repo = {
        id: repoId || '',
        owner,
        slug,
        name: slug,
        fullName: `${owner}/${slug}`,
        description: null,
        isPrivate: false,
        htmlUrl: '',
        language: null,
        defaultBranch: 'main',
        updatedAt: '',
        stats: {},
        permissions: { admin: false, push: false, pull: false },
    };

    const [webhook, webhookError] = await SafeExecute.withSync(async () => 
        gitProvider.createWebhook(repo as any, {
            url,
            events,
            active: active ?? true,
            secret,
            contentType,
            insecureSsl,
        })
    ).execute();

    if (webhookError) {
        const status = (webhookError as any).code === 'AUTH_FAILED' ? 401 : 500;
        return ApiRes.error(webhookError.message || 'Failed to create webhook', 'WEBHOOK_ERROR', status);
    }

    return ApiRes.success({ webhook }, 201);
});
