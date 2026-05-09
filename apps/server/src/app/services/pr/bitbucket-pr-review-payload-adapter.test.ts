import { describe, expect, it } from "vitest";
import { BitbucketPullRequestReviewPayloadAdapter } from "./bitbucket-pr-review-payload-adapter";

describe("BitbucketPullRequestReviewPayloadAdapter", () => {
    it("adapts approval events", () => {
        const adapter = new BitbucketPullRequestReviewPayloadAdapter();

        expect(
            adapter.adapt({
                approval: {},
                pullrequest: {
                    id: 91,
                    source: { branch: { name: "feature-3" } }
                }
            })
        ).toEqual({
            id: "91",
            branch: "feature-3",
            status: "approved"
        });
    });

    it("adapts changes requested events", () => {
        const adapter = new BitbucketPullRequestReviewPayloadAdapter();

        expect(
            adapter.adapt({
                changes_requested: {},
                pullrequest: {
                    id: 91,
                    source: { branch: { name: "feature-3" } }
                }
            })
        ).toEqual({
            id: "91",
            branch: "feature-3",
            status: "changes_requested"
        });
    });

    it("throws for unsupported events", () => {
        const adapter = new BitbucketPullRequestReviewPayloadAdapter();

        expect(() =>
            adapter.adapt({
                pullrequest: {
                    id: 91,
                    source: { branch: { name: "feature-3" } }
                }
            })
        ).toThrow(/Unsupported Bitbucket review event/);
    });
});
