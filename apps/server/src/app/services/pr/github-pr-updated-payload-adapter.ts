import { assertId, assertString, optionalString } from "./helpers";
import { PullRequestPayload, PullRequestPayloadAdapter } from "./types";

export class GitHubPullRequestUpdatedPayloadAdapter implements PullRequestPayloadAdapter {
    adapt(payload: any): PullRequestPayload {
        const pullRequest = payload?.pull_request;

        return {
            id: assertId(pullRequest?.number, "pull_request.number"),
            title: assertString(pullRequest?.title, "pull_request.title"),
            description: optionalString(pullRequest?.body)
        };
    }
}
