import { assertId, assertString } from "./helpers";
import { PullRequestCommentPayload, PullRequestCommentPayloadAdapter } from "./comment-payload-adatper";

const MENTION_REGEX = /@([a-zA-Z0-9][a-zA-Z0-9._-]*)/g;

function extractMentionedUsers(body: string): string[] {
    const mentionedUsers = new Set<string>();
    for (const match of body.matchAll(MENTION_REGEX)) {
        const username = (match[1] || "").trim();
        if (username) {
            mentionedUsers.add(username);
        }
    }

    return [...mentionedUsers];
}

export class GitHubPullRequestCommentPayloadAdapter implements PullRequestCommentPayloadAdapter {
    adapt(payload: any): PullRequestCommentPayload {
        const comment = payload?.comment;
        const body = assertString(comment?.body, "comment.body");

        return {
            id: assertId(comment?.id, "comment.id"),
            body,
            author: assertString(comment?.user?.login ?? comment?.user?.name, "comment.user.login"),
            branch: assertString(payload?.pull_request?.head?.ref, "pull_request.head.ref"),
            mentionedUsers: extractMentionedUsers(body)
        };
    }
}
