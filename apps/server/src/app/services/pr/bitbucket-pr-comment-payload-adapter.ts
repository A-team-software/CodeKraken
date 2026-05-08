import { assertId, assertString } from "./helpers";
import { PullRequestCommentPayload, PullRequestCommentPayloadAdapter } from "./comment-payload-adapter";

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

export class BitbucketPullRequestCommentPayloadAdapter implements PullRequestCommentPayloadAdapter {
    adapt(payload: any): PullRequestCommentPayload {
        const comment = payload?.comment;
        const body = assertString(comment?.content?.raw ?? comment?.content, "comment.content.raw");

        return {
            id: assertId(comment?.id, "comment.id"),
            prId: assertId(payload?.pullrequest?.id, "pullrequest.id"),
            body,
            author: assertString(
                payload?.actor?.username ?? payload?.actor?.nickname ?? payload?.actor?.display_name,
                "actor.username"
            ),
            branch: assertString(payload?.pullrequest?.source?.branch?.name, "pullrequest.source.branch.name"),
            mentionedUsers: extractMentionedUsers(body)
        };
    }
}
