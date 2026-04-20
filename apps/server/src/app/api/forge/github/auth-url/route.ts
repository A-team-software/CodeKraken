import { AuthService, GITHUB_CLIENT_ID, validateForgeRequest } from '@oliver/auth';
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

  // Do NOT pass redirect_uri — let GitHub use the URL registered in the OAuth App.
  // Passing a mismatched redirect_uri causes GitHub's "not associated" error.
  // The GITHUB_CALLBACK_URL env var on Vercel must match whatever is registered.
  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    scope: 'repo',
    state: state,
  });

  const loginUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;

  return NextResponse.json({ loginUrl });
}
