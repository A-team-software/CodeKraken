import { NextRequest } from "next/server";
import { Logger, SafeExecute } from "@oliver/core";
import { AuthService } from "@oliver/auth";
import { ApiRes } from "@/utils/api_response";
import { wrapRoute } from "@/utils/api_handler";

export const POST = wrapRoute(async (request: NextRequest) => {
    const cookies = request.cookies.getAll();
    const authService = AuthService.getInstance();

    // 1. Identify users and providers to delete tokens from DB
    const boardUserCookies = cookies.filter(c => c.name.startsWith("board_provider_user_"));
    const gitUserCookies = cookies.filter(c => c.name.startsWith("git_provider_user_"));

    for (const cookie of boardUserCookies) {
        const provider = cookie.name.replace("board_provider_user_", "");
        const [_, deleteError] = await SafeExecute.withSync(async () => 
            authService.deleteTokens(cookie.value, provider, 'board')
        ).execute();
        if (deleteError) {
            Logger.error(`Failed to delete board token for ${provider}`, { error: deleteError.message });
        }
    }

    for (const cookie of gitUserCookies) {
        const provider = cookie.name.replace("git_provider_user_", "");
        const [_, deleteError] = await SafeExecute.withSync(async () => 
            authService.deleteTokens(cookie.value, provider, 'git')
        ).execute();
        if (deleteError) {
            Logger.error(`Failed to delete git token for ${provider}`, { error: deleteError.message });
        }
    }

    const response = ApiRes.success({ message: "Signed out successfully" });

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
});

export const GET = POST;
