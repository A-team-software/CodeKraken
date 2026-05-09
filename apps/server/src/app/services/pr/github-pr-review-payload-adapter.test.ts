import { describe, expect, it } from "vitest";
import { GitHubPullRequestReviewPayloadAdapter } from "./github-pr-review-payload-adapter";

describe("GitHubPullRequestReviewPayloadAdapter", () => {
    it("adapts approved reviews", () => {
        const adapter = new GitHubPullRequestReviewPayloadAdapter();

        expect(
            adapter.adapt({
                review: { state: "APPROVED" },
                pull_request: { number: 42, head: { ref: "feature-1" } }
            })
        ).toEqual({
            id: "42",
            branch: "feature-1",
            status: "approved"
        });
    });

    it("adapts changes requested reviews", () => {
        const adapter = new GitHubPullRequestReviewPayloadAdapter();

        expect(
            adapter.adapt({
                review: { state: "changes_requested" },
                pull_request: { number: 42, head: { ref: "feature-1" } }
            })
        ).toEqual({
            id: "42",
            branch: "feature-1",
            status: "changes_requested"
        });
    });

    it("throws for unsupported review states", () => {
        const adapter = new GitHubPullRequestReviewPayloadAdapter();

        expect(() =>
            adapter.adapt({
                review: { state: "unknown" },
                pull_request: { number: 42, head: { ref: "feature-1" } }
            })
        ).toThrow(/Unsupported GitHub review state/);
    });
});
