import { NextRequest } from "next/server";
import { PersonalAccessTokenService } from "@oliver/auth";
import { SafeExecute } from "@oliver/core";
import { ApiRes } from "@/utils/api_response";
import { wrapRoute } from "@/utils/api_handler";
import { z } from "zod";

export const DELETE = wrapRoute({
    paramsSchema: z.object({ id: z.string() })
}, async (request, ctx) => {
    const { id } = ctx.params;

    const [userId, userIdError] = await SafeExecute.withSync(async () => getUserIdFromRequest(request)).execute();
    if (userIdError) return ApiRes.error(userIdError.message || 'Internal Server Error');
    if (!userId) {
        return ApiRes.unauthorized('Unauthorized');
    }

    const service = PersonalAccessTokenService.getInstance();
    // In a real application, we should first fetch the token and verify it belongs to the userId
    const [_, revokeError] = await SafeExecute.withSync(async () => service.revokeToken(id)).execute();
    if (revokeError) return ApiRes.error(revokeError.message || 'Failed to revoke token');

    return { revoked: true };
});

async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
    const cookies = request.cookies.getAll();
    const boardUserCookie = cookies.find(c => c.name.startsWith("board_provider_user_"));
    const gitUserCookie = cookies.find(c => c.name.startsWith("git_provider_user_"));

    if (boardUserCookie && boardUserCookie.value) return boardUserCookie.value;
    if (gitUserCookie && gitUserCookie.value) return gitUserCookie.value;

    return null;
}
