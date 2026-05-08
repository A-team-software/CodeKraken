import { PullRequestCommentsProcessorService } from "@/app/services/pr";

const pullRequestCommentsProcessorService = new PullRequestCommentsProcessorService();
let hasStartedPullRequestCommentsProcessor = false;

export async function register(): Promise<void> {
    if (process.env.NEXT_RUNTIME !== "nodejs") {
        return;
    }

    if (hasStartedPullRequestCommentsProcessor) {
        return;
    }

    pullRequestCommentsProcessorService.start();
    hasStartedPullRequestCommentsProcessor = true;
}
