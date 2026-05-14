import { AuthService, GITHUB_CLIENT_ID, validateForgeRequest } from '@oliver/auth';
import { FORGE_GITHUB_CALLBACK_URL, FORGE_BITBUCKET_CALLBACK_URL, SafeExecute } from '@oliver/core';
import { BitbucketService } from '@oliver/git';
import { NextRequest } from 'next/server';
import { ApiRes } from '@/utils/api_response';
import { wrapRoute } from '@/utils/api_handler';

export const POST = wrapRoute(async (req: NextRequest) => {
  const { isValid, error } = validateForgeRequest(req);
  if (!isValid) return ApiRes.unauthorized(error || 'Unauthorized');

  const [body, bodyError] = await SafeExecute.withSync(async () => req.json()).execute();
  if (bodyError || !body) return ApiRes.badRequest('Invalid request body');

  const { accountId, cloudId, provider } = body;
  if (!accountId || !cloudId || !provider) {
    return ApiRes.badRequest('Missing accountId, cloudId, or provider');
  }

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

  return { authUrl };
});
