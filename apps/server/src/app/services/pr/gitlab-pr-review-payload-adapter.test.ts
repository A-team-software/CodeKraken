import { describe, expect, it } from "vitest";
import { GitLabPullRequestReviewPayloadAdapter } from "./gitlab-pr-review-payload-adapter";

describe("GitLabPullRequestReviewPayloadAdapter", () => {
    it("adapts approved merge request review events", () => {
        const adapter = new GitLabPullRequestReviewPayloadAdapter();

        expect(
            adapter.adapt({
                object_kind: "merge_request",
                object_attributes: {
                    iid: 77,
                    action: "approved",
                    source_branch: "feature-2"
                }
            })
        ).toEqual({
            id: "77",
            branch: "feature-2",
            status: "approved"
        });
    });

    it("adapts unapproved merge request review events", () => {
        const adapter = new GitLabPullRequestReviewPayloadAdapter();

        expect(
            adapter.adapt({
                object_kind: "merge_request",
                object_attributes: {
                    iid: 77,
                    action: "unapproved",
                    source_branch: "feature-2"
                }
            })
        ).toEqual({
            id: "77",
            branch: "feature-2",
            status: "changes_requested"
        });
    });

    it("throws for unsupported events", () => {
        const adapter = new GitLabPullRequestReviewPayloadAdapter();

        expect(() =>
            adapter.adapt({
                object_kind: "note",
                object_attributes: {
                    iid: 77,
                    action: "approved",
                    source_branch: "feature-2"
                }
            })
        ).toThrow(/Unsupported GitLab event/);
    });
});
