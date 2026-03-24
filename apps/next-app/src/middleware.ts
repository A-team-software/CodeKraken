import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // We only care about protecting /dashboard and /setup for now.
    // Let all other routes (like /, /api, /integrations) pass through.
    if (!pathname.startsWith('/dashboard') && !pathname.startsWith('/setup')) {
        return NextResponse.next();
    }

    // Since we are in Next.js edge runtime, we can't easily query MongoDB.
    // The user's authenticated state is somewhat tracked by cookies, but Next.js middleware 
    // is best used with JWTs or session tokens.
    // Let's check cookies to see if the user is authenticated.

    // Check for git provider or board provider cookies
    const authCookies = [
        'git_provider_token_github',
        'git_provider_token_bitbucket',
        'board_provider_token_jira',
        'board_provider_token_trello',
        'board_provider_token_asana',
        'board_provider_token_linear'
    ];

    const isAuthenticated = authCookies.some(cookieName => request.cookies.has(cookieName));

    if (!isAuthenticated) {
        // Not authenticated, redirect to landing page
        return NextResponse.redirect(new URL('/', request.url));
    }

    // Identify user onboarding state
    const stepCookie = request.cookies.get('user_onboarding_step');
    const step = stepCookie?.value || 'connect';

    // Rule: Authenticated users must finish onboarding
    if (step === 'completed' && pathname.startsWith('/setup')) {
        // Already completed but trying to access setup wizard
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    if (step !== 'completed' && pathname.startsWith('/dashboard')) {
        // Not completed but trying to access dashboard
        return NextResponse.redirect(new URL(`/setup?step=${step}`, request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/dashboard/:path*', '/setup/:path*'],
};
