let hasStartedPullRequestCommentsProcessor = false;
let pullRequestCommentsProcessorStartPromise: Promise<void> | null = null;
let hasValidatedEnvironment = false;

export async function register(): Promise<void> {
    if (process.env.NEXT_RUNTIME !== "nodejs") {
        return;
    }

    if (!hasValidatedEnvironment && process.env.FEATURE_FLAG_VALIDATE_ENV_ON_START === "true") {
        const { T3ConfigValidator } = await import("./app/config/t3-config-validator");
        const envConfigValidator = new T3ConfigValidator();
        await envConfigValidator.validate();
        hasValidatedEnvironment = true;
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
