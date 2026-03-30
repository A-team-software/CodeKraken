import { NextRequest, NextResponse } from "next/server";
import { userModule } from "@/lib/user/infrastructure/di/UserModule";
import { Logger } from "@/lib/infrastructure/logging/logger";

export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json();
        const { step } = body;

        if (!['connect', 'repos', 'assign', 'completed'].includes(step)) {
            return NextResponse.json({ error: "Invalid step" }, { status: 400 });
        }

        // Identify user from cookies (using board provider user id)
        // We check all possible board providers
        let userId: string | undefined;
        const providers = ['jira', 'trello', 'asana', 'linear'];

        for (const provider of providers) {
            const cookie = request.cookies.get(`board_provider_user_${provider}`);
            if (cookie?.value) {
                userId = cookie.value;
                break;
            }
        }

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await userModule.useCases.updateUserOnboardingStep.execute({ userId, step });

        Logger.info(`Updated onboarding step for user ${userId} to ${step}`);

        // Set cookie for middleware
        const response = NextResponse.json({ success: true, step });
        response.cookies.set({
            name: 'user_onboarding_step',
            value: step,
            maxAge: 30 * 24 * 60 * 60, // 30 days
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
        });

        return response;
    } catch (error: any) {
        if (error.message === 'User not found') {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }
        Logger.error("Failed to update onboarding step", { error: error.message });
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
