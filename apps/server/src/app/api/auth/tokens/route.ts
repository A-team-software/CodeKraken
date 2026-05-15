import { NextRequest } from "next/server";
import { PersonalAccessTokenService } from "@oliver/auth";
import { SafeExecute } from "@oliver/core";
import { ApiRes } from "@/utils/api_response";
import { wrapRoute } from "@/utils/api_handler";
import { z } from "zod";

export const GET = wrapRoute({}, async (request, ctx) => {
    const [userId, userIdError] = await SafeExecute.withSync(async () => getUserIdFromRequest(request)).execute();
    if (userIdError) return ApiRes.error(userIdError.message || 'Internal Server Error');
    if (!userId) {
        return ApiRes.unauthorized('Unauthorized');
    }

    const service = PersonalAccessTokenService.getInstance();
    const [tokens, tokensError] = await SafeExecute.withSync(async () => service.getTokensByUser(userId)).execute();
    if (tokensError || !tokens) return ApiRes.error(tokensError?.message || 'Failed to fetch tokens');

    return {
        tokens: tokens.map(t => ({
            id: t.id,
            name: t.name,
            lastUsedAt: t.lastUsedAt,
            createdAt: t.createdAt,
        }))
    };
});

export const POST = wrapRoute({
    bodySchema: z.object({ name: z.string() })
}, async (request, ctx) => {
    const [userId, userIdError] = await SafeExecute.withSync(async () => getUserIdFromRequest(request)).execute();
    if (userIdError) return ApiRes.error(userIdError.message || 'Internal Server Error');
    if (!userId) {
        return ApiRes.unauthorized('Unauthorized');
    }

    const { name } = ctx.body;

    const service = PersonalAccessTokenService.getInstance();
    const [result, generateError] = await SafeExecute.withSync(async () => service.generateToken(userId, name)).execute();
    if (generateError || !result) return ApiRes.error(generateError?.message || 'Failed to generate token');
    const { rawToken, aggregate } = result;

    return {
        token: {
            id: aggregate.id,
            name: aggregate.name,
            rawToken: rawToken,
            createdAt: aggregate.createdAt,
        }
    };
});

async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
    const cookies = request.cookies.getAll();
    const boardUserCookie = cookies.find(c => c.name.startsWith("board_provider_user_"));
    const gitUserCookie = cookies.find(c => c.name.startsWith("git_provider_user_"));

    if (boardUserCookie && boardUserCookie.value) return boardUserCookie.value;
    if (gitUserCookie && gitUserCookie.value) return gitUserCookie.value;

    return null;
}
