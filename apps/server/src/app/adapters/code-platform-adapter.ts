import { PullRequestCommentPayload } from "@/app/services/pr/comment-payload-adapter";
import { PullRequestComment } from "@/types/pull-request-comment";
import { PullRequestPlatform } from "@/types/pull-request-platform";
import { GitHubCodePlatformAdapter } from "./github-code-platform-adapter";
import { GitLabCodePlatformAdapter } from "./gitlab-code-platform-adapter";
import { BitbucketCodePlatformAdapter } from "./bitbucket-code-platform-adapter";

export interface CodePlatformAdapter {
    getPullRequestAuthorUsername(prId: string): Promise<string | null>;
    getPullRequestComments(prId: string): Promise<PullRequestCommentPayload[]>;
    postCommentOnPullRequest(prId: string, comments: PullRequestComment[]): Promise<void>;
}

export function createCodePlatformAdapter(platform: PullRequestPlatform): CodePlatformAdapter {
    const adapter = (() => {
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
    })();

    return {
        getPullRequestAuthorUsername(prId: string) {
            return adapter.getPullRequestAuthorUsername(prId);
        },
        getPullRequestComments(prId: string) {
            return adapter.getPullRequestComments(prId);
        },
        postCommentOnPullRequest(prId: string, comments: PullRequestComment[]) {
            return adapter.postCommentOnPullRequest(prId, comments);
        },
    };
}
