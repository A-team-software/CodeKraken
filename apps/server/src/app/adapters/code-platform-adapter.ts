import { PullRequestCommentPayload } from "@/app/services/pr/comment-payload-adapter";
import { PullRequestComment } from "@/types/pull-request-comment";
import { PullRequestPlatform } from "@/types/pull-request-platform";
import { GitHubCodePlatformAdapter } from "./github-code-platform-adapter";
import { GitLabCodePlatformAdapter } from "./gitlab-code-platform-adapter";
import { BitbucketCodePlatformAdapter } from "./bitbucket-code-platform-adapter";

export interface CodePlatformAdapter {
    getPullRequestAuthorUsername(prId: string, platform: PullRequestPlatform): Promise<string | null>;
    getPullRequestComments(prId: string, platform: PullRequestPlatform): Promise<PullRequestCommentPayload[]>;
    postCommentOnPullRequest(prId: string, platform: PullRequestPlatform, comments: PullRequestComment[]): Promise<void>;
}

export function createCodePlatformAdapter(platform: PullRequestPlatform): CodePlatformAdapter {
    switch (platform) {
        case "github":
            return new GitHubCodePlatformAdapter();
        case "gitlab":
            return new GitLabCodePlatformAdapter();
        case "bitbucket":
            return new BitbucketCodePlatformAdapter();
        default: {
            const exhaustiveCheck: never = platform;
            throw new Error(`Unsupported platform: ${exhaustiveCheck}`);
        }
    }
}
