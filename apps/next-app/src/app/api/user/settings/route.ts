import { NextRequest, NextResponse } from "next/server";
import { userModule } from "@/lib/user/infrastructure/di/UserModule";
import { Logger } from "@/lib/infrastructure/logging/logger";

export async function GET(request: NextRequest) {
    try {
        const userId = request.cookies.get("board_provider_user_jira")?.value;
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await userModule.repositories.userRepository.findById(userId);

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        return NextResponse.json({ settings: user.settings });
    } catch (error: any) {
        Logger.error("GET /api/user/settings error", { error });
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const userId = request.cookies.get("board_provider_user_jira")?.value;
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { settings } = await request.json();

        const updatedSettings = await userModule.useCases.updateUserSettings.execute({
            userId,
            settings
        });

        return NextResponse.json({ success: true, settings: updatedSettings });
    } catch (error: any) {
        if (error.message === 'User not found') {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }
        Logger.error("POST /api/user/settings error", { error });
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
