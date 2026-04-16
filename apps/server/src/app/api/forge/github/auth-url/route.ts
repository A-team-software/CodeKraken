import { AuthService, GITHUB_CLIENT_ID, validateForgeRequest } from '@oliver/auth';
import { FORGE_GITHUB_CALLBACK_URL } from '@oliver/core';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { isValid, error } = validateForgeRequest(req);
  if (!isValid) return new NextResponse(error!, { status: 400 });

  const { accountId, cloudId } = await req.json();
  if (!accountId || !cloudId) {
    return new NextResponse('Missing accountId or cloudId', { status: 400 });
  }

  // Generate state with Forge metadata using the standard AuthService
  const authService = AuthService.getInstance();
  const metadata = JSON.stringify({
    forge: true,
    accountId,
    cloudId
  });
  const state = await authService.generateState('github', metadata);

  // Use the standard registered callback URL to avoid registration issues
  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    scope: 'repo',
    state: state,
    redirect_uri: FORGE_GITHUB_CALLBACK_URL
  });

  const authUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;

  return NextResponse.json({ authUrl });
}
