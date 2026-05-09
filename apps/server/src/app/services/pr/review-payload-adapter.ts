export interface ReviewPayload {
    id: string;
    branch: string;
    status: 'approved' | 'changes_requested' | 'comment' | 'rejected';
}

export interface ReviewPayloadAdapter {
  adapt(payload: any): ReviewPayload;
}
