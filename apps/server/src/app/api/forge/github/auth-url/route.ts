import { AuthService, GITHUB_CLIENT_ID, GITHUB_CALLBACK_URL, validateForgeRequest } from '@oliver/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const result = validateForgeRequest(req);
  if (!result.isValid) return new NextResponse(result.error!, { status: result.status || 400 });

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

  // We explicitly inclusion the redirect_uri to ensure it matches the authorized list.
  // This value must match exactly what is registered in the GitHub OAuth App.
  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    scope: 'repo',
    state: state,
    redirect_uri: GITHUB_CALLBACK_URL,
  });

  const loginUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;

  return NextResponse.json({ loginUrl });
}
