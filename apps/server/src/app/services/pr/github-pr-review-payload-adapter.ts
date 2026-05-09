import { assertId, assertString } from "./helpers";
import { ReviewPayload, ReviewPayloadAdapter } from "./review-payload-adapter";

const GITHUB_REVIEW_STATE_MAP: Record<string, ReviewPayload["status"] | undefined> = {
    approved: "approved",
    changes_requested: "changes_requested",
    commented: "comment",
    dismissed: "rejected",
};

export class GitHubPullRequestReviewPayloadAdapter implements ReviewPayloadAdapter {
    adapt(payload: any): ReviewPayload {
        const review = payload?.review;
        const state = typeof review?.state === "string" ? review.state.toLowerCase() : "";
        const status = GITHUB_REVIEW_STATE_MAP[state];

        if (!status) {
            throw new Error(`Unsupported GitHub review state: "${review?.state}". Expected one of: approved, changes_requested, commented, dismissed.`);
        }

        return {
            id: assertId(payload?.pull_request?.number, "pull_request.number"),
            branch: assertString(payload?.pull_request?.head?.ref, "pull_request.head.ref"),
            status,
        };
    }
}
