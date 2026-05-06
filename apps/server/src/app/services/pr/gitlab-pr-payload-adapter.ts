import { assertId, assertString, optionalString } from "./helpers";
import { PullRequestPayload, PullRequestPayloadAdapter } from "./types";

export class GitLabPullRequestPayloadAdapter implements PullRequestPayloadAdapter {
    adapt(payload: any): PullRequestPayload {
        const objectKind = payload?.object_kind;
        const attributes = payload?.object_attributes;
        const state = attributes?.state;

        if (objectKind !== "merge_request" || state !== "merged") {
            throw new Error("Unsupported GitLab event: expected a merged merge_request event.");
        }

        return {
            id: assertId(attributes?.iid ?? attributes?.id, "object_attributes.iid"),
            title: assertString(attributes?.title, "object_attributes.title"),
            description: optionalString(attributes?.description)
        };
    }
}
