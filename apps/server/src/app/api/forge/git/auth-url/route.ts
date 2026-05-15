import { AuthService, GITHUB_CLIENT_ID, validateForgeRequest } from '@oliver/auth';
import { FORGE_GITHUB_CALLBACK_URL, FORGE_BITBUCKET_CALLBACK_URL, SafeExecute } from '@oliver/core';
import { BitbucketService } from '@oliver/git';
import { NextRequest } from 'next/server';
import { ApiRes } from '@/utils/api_response';
import { wrapRoute } from '@/utils/api_handler';
import { z } from 'zod';

export const POST = wrapRoute({
  bodySchema: z.object({
    accountId: z.string(),
    cloudId: z.string(),
    provider: z.string()
  })
}, async (req, ctx) => {
  const { isValid, error } = validateForgeRequest(req);
  if (!isValid) return ApiRes.unauthorized(error || 'Unauthorized');

  const { accountId, cloudId, provider } = ctx.body;

  // Generate state with Forge metadata using the standard AuthService
  const authService = AuthService.getInstance();
  const metadata = JSON.stringify({
    forge: true,
    accountId,
    cloudId
  });
  const state = await authService.generateState(provider, metadata);

  let authUrl = '';
  if (provider === 'bitbucket') {
    authUrl = BitbucketService.getLoginUrl(state, FORGE_BITBUCKET_CALLBACK_URL);
  } else {
    // Use the standard registered callback URL to avoid registration issues
    const params = new URLSearchParams({
      client_id: GITHUB_CLIENT_ID,
      scope: 'repo',
      state: state,
      redirect_uri: FORGE_GITHUB_CALLBACK_URL
    });
    authUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  return ApiRes.success({ authUrl }, 200, { headers: { 'Content-Type': 'application/json' } });
});
