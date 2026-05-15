import { validateForgeRequest } from '@oliver/auth';
import { NextRequest } from 'next/server';
import { SafeExecute } from '@oliver/core/src/errors';
import { ApiRes } from '@/utils/api_response';

export async function POST(req: NextRequest) {

    const [body, bodyError] = await SafeExecute.withSync(async () => req.json()).execute();
    if (bodyError || !body) return ApiRes.badRequest('Invalid request body');

    const { accountId, provider } = body;
    const cloudId = body.cloudId || body.clientKey;

    if (!accountId || !cloudId) {
        return ApiRes.badRequest('Missing accountId or cloudId');
    }

    try {
        const [auth, importAuthError] = await SafeExecute.withSync(async () => import('@oliver/auth')).execute();
        if (importAuthError || !auth) return ApiRes.error(importAuthError?.message || 'Failed to import auth module');
        const { MongoOAuthTokenRepository } = auth;

        const tokenRepo = new MongoOAuthTokenRepository();

        // Invalidate by Atlassian identifiers - sets tokens to null instead of deleting record
        const [invalidated, invalidateError] = await SafeExecute.withSync(async () =>
            tokenRepo.invalidateByAtlassianAccountIdAndCloudId(accountId, cloudId, 'git', provider)
        ).execute();

        if (invalidateError) {
            console.error('Forge git disconnect invalidation failed:', invalidateError);
            return ApiRes.error(invalidateError.message, 'INVALIDATION_FAILED');
        }

        return ApiRes.success({ invalidated });
    } catch (e: any) {
        console.error('Forge github disconnect failed:', e);
        return ApiRes.error(e.message);
    }
}
