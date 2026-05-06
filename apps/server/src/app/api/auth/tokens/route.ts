import { NextRequest, NextResponse } from "next/server";
import { PersonalAccessTokenService } from "@oliver/auth";
import { Logger, SafeExecute } from "@oliver/core";

export async function GET(request: NextRequest) {
    try {
        const [userId, userIdError] = await SafeExecute.withSync(async () => getUserIdFromRequest(request)).execute();
        if (userIdError) return NextResponse.json({ error: userIdError.message || 'Internal Server Error' }, { status: 500 });
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const service = PersonalAccessTokenService.getInstance();
        const [tokens, tokensError] = await SafeExecute.withSync(async () => service.getTokensByUser(userId)).execute();
        if (tokensError || !tokens) return NextResponse.json({ error: tokensError?.message || 'Failed to fetch tokens' }, { status: 500 });

        return NextResponse.json({
            tokens: tokens.map(t => ({
                id: t.id,
                name: t.name,
                lastUsedAt: t.lastUsedAt,
                createdAt: t.createdAt,
            }))
        });
    } catch (error: any) {
        Logger.error("GET /api/auth/tokens error", { error: error.message });
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const [userId, userIdError] = await SafeExecute.withSync(async () => getUserIdFromRequest(request)).execute();
        if (userIdError) return NextResponse.json({ error: userIdError.message || 'Internal Server Error' }, { status: 500 });
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const [body, bodyError] = await SafeExecute.withSync(async () => request.json()).execute();
        if (bodyError || !body) return NextResponse.json({ error: bodyError?.message || 'Invalid request body' }, { status: 400 });
        const { name } = body;
        if (!name) {
            return NextResponse.json({ error: "Missing required field: name" }, { status: 400 });
        }

        const service = PersonalAccessTokenService.getInstance();
        const [result, generateError] = await SafeExecute.withSync(async () => service.generateToken(userId, name)).execute();
        if (generateError || !result) return NextResponse.json({ error: generateError?.message || 'Failed to generate token' }, { status: 500 });
        const { rawToken, aggregate } = result;

        return NextResponse.json({
            success: true,
            token: {
                id: aggregate.id,
                name: aggregate.name,
                rawToken: rawToken,
                createdAt: aggregate.createdAt,
            }
        });
    } catch (error: any) {
        console.error("POST /api/auth/tokens error details:", {
            message: error.message,
            stack: error.stack,
            cause: error.cause
        });
        console.error("POST /api/auth/tokens error", { error: error.message });
        return NextResponse.json({
            error: "Internal Server Error",
            details: error.message
        }, { status: 500 });
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
