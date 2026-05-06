import { assertId, assertString, optionalString } from "./helpers";
import { PullRequestPayload, PullRequestPayloadAdapter } from "./types";

export class BitbucketPullRequestPayloadAdapter implements PullRequestPayloadAdapter {
    adapt(payload: any): PullRequestPayload {
        const pullRequest = payload?.pullrequest;
        const state = pullRequest?.state;

        if (state !== "MERGED") {
            throw new Error("Unsupported Bitbucket event: expected a merged pullrequest event.");
        }

        return {
            id: assertId(pullRequest?.id, "pullrequest.id"),
            title: assertString(pullRequest?.title, "pullrequest.title"),
            description: optionalString(pullRequest?.description)
        };
    }
}
