import { NextRequest, NextResponse } from 'next/server';
import { AuthenticateGitProviderUseCase } from '@oliver/git';
import { GitProviderError } from '@oliver/shared';
import { TOKEN_COOKIE_NAME } from '@oliver/auth';
import { z, ZodError, ZodSafeParseResult } from 'zod';
import { SafeExecute } from '@oliver/core/src/errors';

/**
 * POST /api/providers/[type]
 * Authenticate with a git provider via a manually supplied token (legacy / PAT flow).
 * For OAuth-based auth, use GET /api/git/[provider]/oauth instead.
 * AssignedRepoSchema
 * Body: { token: "..." }
 */

const paramSchema = z.object({
    type: z.string(),
});

export type Params = z.infer<typeof paramSchema>;

export async function POST(request: NextRequest, { params }: { params: Promise<Params> }) {
    try {

        const [typeResult, error] = await SafeExecute.withSync<ZodSafeParseResult<{ type: string; }> | null, Array<ZodError | null>>(async () => paramSchema.safeParseAsync(params))
            .execute();

        const [req, err] = await SafeExecute.withSync(async () => request.json())
            .execute();

        if (!(req) || err) {
            const { token } = req;
            const errorMessage = error ? error.message : (!token) ? "Missing token" : "Bad request";
            return NextResponse.json({ success: false, message: errorMessage, code: 400 });
        }

        if (!(typeResult) || (typeResult.error) || (error)) {
            const errorMessage = `${typeResult ? typeResult.error : error ? error.message : "bad query params or query params missing"} `
            return NextResponse.json({ success: false, message: `Bad request: ${errorMessage} `, code: 400 });
        }

        const type = typeResult.data.type;
        const { token } = req;



        if (!token) {
            return NextResponse.json({ error: 'Token required' }, { status: 400 });
        }

        const useCase = new AuthenticateGitProviderUseCase();
        const result = await useCase.execute({ providerType: type, token });

        if (!result.success) {
            return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
        }

        const response = NextResponse.json({
            success: true,
            user: result.user,
            provider: type,
        });

        response.cookies.set({
            name: `${TOKEN_COOKIE_NAME}_${type} `,
            value: token,
            maxAge: 7 * 24 * 60 * 60,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
        });

        return response;
    } catch (error: any) {
        const message = error instanceof GitProviderError ? error.message : 'Authentication failed';
        return NextResponse.json(
            { error: message, code: error?.code || 'UNKNOWN' },
            { status: error instanceof GitProviderError && error.code === 'AUTH_FAILED' ? 401 : 500 }
        );
    }
}
