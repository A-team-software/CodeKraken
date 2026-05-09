import { AuthService, GITHUB_CLIENT_ID, validateForgeRequest } from '@oliver/auth';
import { FORGE_GITHUB_CALLBACK_URL, FORGE_BITBUCKET_CALLBACK_URL, SafeExecute } from '@oliver/core';
import { BitbucketService } from '@oliver/git';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { isValid, error } = validateForgeRequest(req);
  if (!isValid) return NextResponse.json({ error: error }, { status: 401 });

  const [body, bodyError] = await SafeExecute.withSync(async () => req.json()).execute();
  if (bodyError || !body) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });

  const { accountId, cloudId, provider = 'github' } = body;
  if (!accountId || !cloudId) {
    return NextResponse.json({ error: 'Missing accountId or cloudId' }, { status: 400 });
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

  return NextResponse.json({ authUrl });
}
