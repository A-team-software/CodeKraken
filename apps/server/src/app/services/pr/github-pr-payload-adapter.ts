import { assertId, assertString, optionalString } from "./helpers";
import { PullRequestPayload, PullRequestPayloadAdapter } from "./types";

export class GitHubPullRequestPayloadAdapter implements PullRequestPayloadAdapter {
    adapt(payload: any): PullRequestPayload {
        const action = payload?.action;
        const pullRequest = payload?.pull_request;

        if (action !== "closed" || pullRequest?.merged !== true) {
            throw new Error("Unsupported GitHub event: expected a merged pull_request event.");
        }

        return {
            id: assertId(pullRequest?.number, "pull_request.number"),
            title: assertString(pullRequest?.title, "pull_request.title"),
            description: optionalString(pullRequest?.body)
        };
    }
}
