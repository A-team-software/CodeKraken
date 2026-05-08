export interface PullRequestCommentPayload {
    id: string;
    body: string;
    author: string;
    branch: string;
    mentionedUsers: string[];
}

export interface PullRequestCommentPayloadAdapter {
    adapt: (payload: any) => PullRequestCommentPayload;
}
