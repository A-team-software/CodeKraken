import { NextRequest, NextResponse } from 'next/server';
import { AtlassianConnectService } from '@/lib/application/services/AtlassianConnectService';
import { MongoUserJiraSiteAccessRepository } from '@/lib/infrastructure/db/mongodb/repositories/UserJiraSiteAccessRepository.mongo';
import { ValidateUserSiteAccessUseCase } from '@/lib/application/use_cases/atlassian/ValidateUserSiteAccessUseCase';
import { Logger } from '@/lib/infrastructure/logging/logger';

export async function atlassianMiddleware(req: NextRequest) {
    const connectService = new AtlassianConnectService();
    const token = extractJwt(req);

    if (!token) {
        return NextResponse.json({ error: 'Missing JWT token' }, { status: 401 });
    }

    try {
        await connectService.verifyJwt(
            token,
            req.method,
            req.nextUrl.pathname + req.nextUrl.search
        );
        return NextResponse.next();
    } catch (error) {
        Logger.error('Atlassian Middleware Auth Failed', error);
        return NextResponse.json({ error: 'Unauthorized: Invalid JWT' }, { status: 401 });
    }
}

/**
 * Middleware to validate user has access to a Jira site
 * Used for user-initiated requests (as opposed to app-level requests)
 */
export async function validateUserJiraAccessMiddleware(
    req: NextRequest,
    userId: string,
    jiraBaseUrl: string
): Promise<boolean> {
    try {
        const clientKey = new URL(jiraBaseUrl).hostname;

        if (!clientKey) {
            Logger.warn('Could not extract clientKey from Jira URL', { jiraBaseUrl });
            return false;
        }

        const accessRepo = new MongoUserJiraSiteAccessRepository();
        const validateUseCase = new ValidateUserSiteAccessUseCase(accessRepo);

        const result = await validateUseCase.execute({
            userId,
            clientKey
        });

        if (!result.isValid) {
            Logger.warn('User unauthorized for Jira site access', {
                userId,
                clientKey,
                reason: result.reason
            });
        }

        return result.isValid;
    } catch (error) {
        Logger.error('Error validating user Jira access', { userId, error });
        return false;
    }
}

function extractJwt(req: NextRequest): string | null {
    // Check Authorization header
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('JWT ')) {
        return authHeader.split(' ')[1];
    }

    // Check query parameter (common in iframes)
    const queryJwt = req.nextUrl.searchParams.get('jwt');
    if (queryJwt) {
        return queryJwt;
    }

    return null;
}
