let hasStartedPullRequestCommentsProcessor = false;
let pullRequestCommentsProcessorStartPromise: Promise<void> | null = null;

export async function register(): Promise<void> {
    if (process.env.NEXT_RUNTIME !== "nodejs") {
        return;
    }

    if (hasStartedPullRequestCommentsProcessor) {
        return;
    }

    if (pullRequestCommentsProcessorStartPromise) {
        await pullRequestCommentsProcessorStartPromise;
        return;
    }

    pullRequestCommentsProcessorStartPromise = (async () => {
        const { PullRequestCommentsProcessorService } = await import("@/app/services/pr");
        const pullRequestCommentsProcessorService = new PullRequestCommentsProcessorService();
        pullRequestCommentsProcessorService.start();
        hasStartedPullRequestCommentsProcessor = true;
    })();

    try {
        await pullRequestCommentsProcessorStartPromise;
    } finally {
        pullRequestCommentsProcessorStartPromise = null;
    }
}
