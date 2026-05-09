export interface PullRequestComment {
    id: string;
    authorUsername: string;
    content: string;
    filePath?: string;
    lineNumber?: number;
    createdAt: Date;
}
