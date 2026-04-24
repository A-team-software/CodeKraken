import { NextRequest, NextResponse } from "next/server";
import { Logger } from "@/lib/infrastructure/logging/logger";
import { userModule } from "@/lib/user/infrastructure/di/UserModule";

export async function GET(request: NextRequest) {
    try {
        const cookies = request.cookies.getAll();

        // Find any board provider user cookie
        const boardUserCookie = cookies.find(c => c.name.startsWith("board_provider_user_"));

        // Find any git provider user cookie
        const gitUserCookie = cookies.find(c => c.name.startsWith("git_provider_user_"));

        let userProfile: any = null;

        try {
            if (boardUserCookie && boardUserCookie.value) {
                // For boards, the cookie holds the system user ID
                userProfile = await userModule.useCases.getUserProfile.execute({ id: boardUserCookie.value });
            } else if (gitUserCookie && gitUserCookie.value) {
                // For git providers, the cookie holds the username
                try {
                    userProfile = await userModule.useCases.getUserProfile.execute({ username: gitUserCookie.value });
                } catch {
                    // Fallback to checking id (some providers might store ID instead)
                    userProfile = await userModule.useCases.getUserProfile.execute({ id: gitUserCookie.value });
                }
            }
        } catch (error: any) {
            if (error.message !== 'User not found') {
                throw error;
            }
        }

        if (!userProfile) {
            return NextResponse.json({ user: null, authenticated: false });
        }

        return NextResponse.json({
            authenticated: true,
            user: {
                id: userProfile.id || userProfile.username,
                name: userProfile.name,
                username: userProfile.username,
                avatarUrl: userProfile.avatarUrl,
                email: userProfile.email,
                role: userProfile.role,
                image: userProfile.image
            }
        });
    } catch (error: any) {
        Logger.error("GET /api/user/me error", { error: error.message });
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
