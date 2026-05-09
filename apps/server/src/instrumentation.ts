let hasStartedPullRequestCommentsProcessor = false;

export async function register(): Promise<void> {
    if (process.env.NEXT_RUNTIME !== "nodejs") {
        return;
    }

    if (hasStartedPullRequestCommentsProcessor) {
        return;
    }

    const { PullRequestCommentsProcessorService } = await import("@/app/services/pr");
    const pullRequestCommentsProcessorService = new PullRequestCommentsProcessorService();
    pullRequestCommentsProcessorService.start();
    hasStartedPullRequestCommentsProcessor = true;
}
