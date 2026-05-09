import { PullRequestPlatform } from "@/types/pull-request-platform";

export function resolvePlatform(value: string | null): PullRequestPlatform {
    const normalized = (value || "").trim().toLowerCase();
    if (normalized === "github" || normalized === "gitlab" || normalized === "bitbucket") {
        return normalized;
    }

    throw new Error("Missing or invalid platform query parameter. Use one of: github, gitlab, bitbucket.");
}
