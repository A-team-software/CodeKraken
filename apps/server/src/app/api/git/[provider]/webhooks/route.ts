import { NextRequest, NextResponse } from 'next/server';
import { GitProviderFactory } from '@oliver/git';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ provider: string }> }
) {
    try {
        const { provider } = await params;
        const { searchParams } = new URL(request.url);
        const repoId = searchParams.get('repoId');
        const owner = searchParams.get('owner');
        const slug = searchParams.get('slug');

        const token = request.headers.get('authorization')?.replace('Bearer ', '');

        if (!token) {
            return NextResponse.json({ error: 'No authorization token provided' }, { status: 401 });
        }

        if (!repoId && (!owner || !slug)) {
            return NextResponse.json(
                { error: 'Either repoId or owner+slug query parameters are required' },
                { status: 400 }
            );
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

        const webhooks = await gitProvider.getWebhooks(repo);

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
        const { repoId, owner, slug, url, events, active, secret, contentType, insecureSsl } = body;

        if (!owner || !slug || !url || !events) {
            return NextResponse.json(
                { error: 'owner, slug, url, and events are required' },
                { status: 400 }
            );
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

        const webhook = await gitProvider.createWebhook(repo, {
            url,
            events,
            active: active ?? true,
            secret,
            contentType,
            insecureSsl,
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
