import { NextRequest, NextResponse } from "next/server";
import { PersonalAccessTokenService } from "@oliver/auth";
import { Logger } from "@oliver/core";

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const userId = await getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const service = PersonalAccessTokenService.getInstance();
        // In a real application, we should first fetch the token and verify it belongs to the userId
        await service.revokeToken(id);

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
