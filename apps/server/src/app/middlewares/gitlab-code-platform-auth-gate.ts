import { CodePlatformAuthGate, compareSecrets } from "@/app/middlewares/code-platform-auth-gate";

export class GitlabCodePlatformAuthGate implements CodePlatformAuthGate {
    async authorizeRequest(headers: Headers, _rawBody: string): Promise<{ authorized: boolean; platform?: "gitlab" }> {
        const secret = process.env.GITLAB_WEBHOOK_AUTH_SECRET?.trim();
        if (!secret) {
            return { authorized: true, platform: "gitlab" };
        }

        const token = headers.get("x-gitlab-token") ?? "";
        return { authorized: compareSecrets(token, secret), platform: "gitlab" };
    }
}
