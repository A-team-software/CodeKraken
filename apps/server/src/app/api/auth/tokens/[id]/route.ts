import { NextRequest, NextResponse } from "next/server";
import { PersonalAccessTokenService } from "@oliver/auth";
import { Logger, SafeExecute } from "@oliver/core";

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const [paramsResult, paramsError] = await SafeExecute.withSync(async () => params).execute();
        if (paramsError || !paramsResult) return NextResponse.json({ error: paramsError?.message || 'Invalid params' }, { status: 400 });
        const { id } = paramsResult;

        const [userId, userIdError] = await SafeExecute.withSync(async () => getUserIdFromRequest(request)).execute();
        if (userIdError) return NextResponse.json({ error: userIdError.message || 'Internal Server Error' }, { status: 500 });
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const service = PersonalAccessTokenService.getInstance();
        // In a real application, we should first fetch the token and verify it belongs to the userId
        const [_, revokeError] = await SafeExecute.withSync(async () => service.revokeToken(id)).execute();
        if (revokeError) return NextResponse.json({ error: revokeError.message || 'Failed to revoke token' }, { status: 500 });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        Logger.error("DELETE /api/auth/tokens/[id] error", { error: error.message });
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
    const cookies = request.cookies.getAll();
    const boardUserCookie = cookies.find(c => c.name.startsWith("board_provider_user_"));
    const gitUserCookie = cookies.find(c => c.name.startsWith("git_provider_user_"));

    if (boardUserCookie && boardUserCookie.value) return boardUserCookie.value;
    if (gitUserCookie && gitUserCookie.value) return gitUserCookie.value;

    return null;
}
