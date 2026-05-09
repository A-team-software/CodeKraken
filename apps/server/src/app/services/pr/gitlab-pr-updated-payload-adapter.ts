import { assertId, assertString, optionalString } from "./helpers";
import { PullRequestPayload, PullRequestPayloadAdapter } from "./types";

export class GitLabPullRequestUpdatedPayloadAdapter implements PullRequestPayloadAdapter {
    adapt(payload: any): PullRequestPayload {
        const attributes = payload?.object_attributes;

        return {
            id: assertId(attributes?.iid ?? attributes?.id, "object_attributes.iid"),
            title: assertString(attributes?.title, "object_attributes.title"),
            description: optionalString(attributes?.description)
        };
    }
}
