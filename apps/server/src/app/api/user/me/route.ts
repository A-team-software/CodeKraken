import { NextRequest, NextResponse } from "next/server";
import { Logger } from "@oliver/core";
import { SafeExecute } from "@oliver/core/src/errors";
import { UserProfileDTO, userModule } from "@oliver/user";

export async function GET(request: NextRequest) {
    try {
        const cookies = request.cookies.getAll();

        // Find any board provider user cookie
        const boardUserCookie = cookies.find(c => c.name.startsWith("board_provider_user_"));

        // Find any git provider user cookie
        const gitUserCookie = cookies.find(c => c.name.startsWith("git_provider_user_"));

        let userProfile: UserProfileDTO | null = null;

        if (boardUserCookie && boardUserCookie.value) {
            // For boards, the cookie holds the system user ID
            const [result, error] = await SafeExecute.withSync(async () =>
                userModule.useCases.getUserProfile.execute({ id: boardUserCookie.value! })
            ).execute();

            if (error && error.message !== 'User not found') {
                return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
            }
            userProfile = result;
        } else if (gitUserCookie && gitUserCookie.value) {
            // For git providers, the cookie holds the username
            const [result, error] = await SafeExecute.withSync(async () =>
                userModule.useCases.getUserProfile.execute({ username: gitUserCookie.value! })
            ).execute();

            if (error) {
                // Fallback to checking id (some providers might store ID instead)
                const [idResult, idError] = await SafeExecute.withSync(async () =>
                    userModule.useCases.getUserProfile.execute({ id: gitUserCookie.value! })
                ).execute();

                if (idError && idError.message !== 'User not found') {
                    return NextResponse.json({ error: idError.message || 'Internal Server Error' }, { status: 500 });
                }
                userProfile = idResult;
            } else {
                userProfile = result;
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
