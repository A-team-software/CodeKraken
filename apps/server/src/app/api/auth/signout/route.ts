import { NextRequest, NextResponse } from "next/server";
import { Logger } from "@oliver/core";
import { AuthService } from "@oliver/auth";

export async function POST(request: NextRequest) {
    try {
        const response = NextResponse.json({ success: true, message: "Signed out successfully" });
        const cookies = request.cookies.getAll();
        const authService = AuthService.getInstance();

        // 1. Identify users and providers to delete tokens from DB
        const boardUserCookies = cookies.filter(c => c.name.startsWith("board_provider_user_"));
        const gitUserCookies = cookies.filter(c => c.name.startsWith("git_provider_user_"));

        for (const cookie of boardUserCookies) {
            const provider = cookie.name.replace("board_provider_user_", "");
            await authService.deleteTokens(cookie.value, provider, 'board').catch(e =>
                Logger.error(`Failed to delete board token for ${provider}`, { error: e.message })
            );
        }

        for (const cookie of gitUserCookies) {
            const provider = cookie.name.replace("git_provider_user_", "");
            await authService.deleteTokens(cookie.value, provider, 'git').catch(e =>
                Logger.error(`Failed to delete git token for ${provider}`, { error: e.message })
            );
        }

        // 2. Clear all relevant cookies
        for (const cookie of cookies) {
            if (
                cookie.name.startsWith("git_provider_") ||
                cookie.name.startsWith("board_provider_") ||
                cookie.name.startsWith("user_onboarding_")
            ) {
                response.cookies.set({
                    name: cookie.name,
                    value: "",
                    expires: new Date(0),
                    path: "/",
                });
            }
        }

        Logger.info("User signed out, tokens deleted from DB and cookies cleared");
        return response;
    } catch (error: any) {
        Logger.error("Sign out error", { error: error.message });
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    return POST(request);
}
