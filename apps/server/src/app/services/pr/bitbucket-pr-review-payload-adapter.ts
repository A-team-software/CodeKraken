import { assertId, assertString } from "./helpers";
import { ReviewPayload, ReviewPayloadAdapter } from "./review-payload-adapter";

export class BitbucketPullRequestReviewPayloadAdapter implements ReviewPayloadAdapter {
    adapt(payload: any): ReviewPayload {
        const pullRequest = payload?.pullrequest;
        const id = assertId(pullRequest?.id, "pullrequest.id");
        const branch = assertString(pullRequest?.source?.branch?.name, "pullrequest.source.branch.name");
        const status = this.resolveStatus(payload);

        return { id, branch, status };
    }

    private resolveStatus(payload: any): ReviewPayload["status"] {
        if (payload?.approval !== undefined) {
            return "approved";
        }

        if (payload?.changes_requested !== undefined) {
            return "changes_requested";
        }

        throw new Error("Unsupported Bitbucket review event: expected an approval or changes_requested payload.");
    }
}
