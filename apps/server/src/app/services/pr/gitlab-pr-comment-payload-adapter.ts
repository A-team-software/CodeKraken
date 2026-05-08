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

export class GitLabPullRequestCommentPayloadAdapter implements PullRequestCommentPayloadAdapter {
    adapt(payload: any): PullRequestCommentPayload {
        const objectKind = payload?.object_kind;
        const attributes = payload?.object_attributes;
        const noteableType = attributes?.noteable_type;

        if (objectKind !== "note" || (typeof noteableType === "string" && noteableType !== "MergeRequest")) {
            throw new Error("Unsupported GitLab event: expected a merge request note event.");
        }

        const body = assertString(attributes?.note, "object_attributes.note");
        const mergeRequestId = assertId(payload?.merge_request?.iid ?? payload?.merge_request?.id, "merge_request.iid");
        const commentId = assertId(attributes?.id, "object_attributes.id");

        return {
            id: commentId,
            prId: mergeRequestId,
            body,
            author: assertString(payload?.user?.username ?? payload?.user?.name, "user.username"),
            branch: assertString(payload?.merge_request?.source_branch, "merge_request.source_branch"),
            mentionedUsers: extractMentionedUsers(body)
        };
    }
}
