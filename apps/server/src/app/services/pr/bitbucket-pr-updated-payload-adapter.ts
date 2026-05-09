import { assertId, assertString, optionalString } from "./helpers";
import { PullRequestPayload, PullRequestPayloadAdapter } from "./types";

export class BitbucketPullRequestUpdatedPayloadAdapter implements PullRequestPayloadAdapter {
    adapt(payload: any): PullRequestPayload {
        const pullRequest = payload?.pullrequest;

        return {
            id: assertId(pullRequest?.id, "pullrequest.id"),
            title: assertString(pullRequest?.title, "pullrequest.title"),
            description: optionalString(pullRequest?.description)
        };
    }
}
