export interface PullRequestCommentPayload {
    id: string;
    prId: string;
    body: string;
    author: string;
    branch: string;
    mentionedUsers: string[];
    filePath?: string;
    lineNumber?: number;
    resolved?: boolean;
}

export interface PullRequestCommentPayloadAdapter {
    adapt: (payload: any) => PullRequestCommentPayload;
}
