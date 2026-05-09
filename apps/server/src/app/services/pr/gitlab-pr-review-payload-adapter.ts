import { assertId, assertString } from "./helpers";
import { ReviewPayload, ReviewPayloadAdapter } from "./review-payload-adapter";

const GITLAB_ACTION_MAP: Record<string, ReviewPayload["status"] | undefined> = {
    approved: "approved",
    unapproved: "changes_requested",
};

export class GitLabPullRequestReviewPayloadAdapter implements ReviewPayloadAdapter {
    adapt(payload: any): ReviewPayload {
        const objectKind = payload?.object_kind;
        const attributes = payload?.object_attributes;
        const action = typeof attributes?.action === "string" ? attributes.action.toLowerCase() : "";
        const status = GITLAB_ACTION_MAP[action];

        if (objectKind !== "merge_request" || !status) {
            throw new Error(`Unsupported GitLab event: expected a merge_request review event with action "approved" or "unapproved", got object_kind="${objectKind}" action="${attributes?.action}".`);
        }

        return {
            id: assertId(attributes?.iid ?? attributes?.id, "object_attributes.iid"),
            branch: assertString(attributes?.source_branch, "object_attributes.source_branch"),
            status,
        };
    }
}
