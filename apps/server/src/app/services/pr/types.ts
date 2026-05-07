export interface PullRequestPayload {
    id: string;
    title: string;
    description?: string;
}

export interface PullRequestPayloadAdapter {
    adapt: (payload: any) => PullRequestPayload;
}
