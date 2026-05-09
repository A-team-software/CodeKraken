import { assertId, assertString, optionalString } from "./helpers";
import { PullRequestPayload, PullRequestPayloadAdapter } from "./types";

export class GitLabPullRequestUpdatedPayloadAdapter implements PullRequestPayloadAdapter {
    adapt(payload: any): PullRequestPayload {
        const attributes = payload?.object_attributes;
        const idField = attributes?.iid != null ? "object_attributes.iid" : "object_attributes.id";

        return {
            id: assertId(attributes?.iid ?? attributes?.id, idField),
            title: assertString(attributes?.title, "object_attributes.title"),
            description: optionalString(attributes?.description)
        };
    }
}
