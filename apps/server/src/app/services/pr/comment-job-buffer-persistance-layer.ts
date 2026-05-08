import { MongoConnectionManager } from "@oliver/db";

import { PullRequestCommentPayload } from "./comment-payload-adatper";

export interface CommentsJobBuffer {
    branch: string;
    prId: string;
    comments: PullRequestCommentPayload[];
    processed: boolean;
    createdAt: number;
    updatedAt: number;
}

export interface CommentJobBufferPersistanceLayer {
    bufferComment(comment: PullRequestCommentPayload): Promise<void>;
    findUnprocessedBuffersOlderThan(cutoffTimestamp: number): Promise<CommentsJobBuffer[]>;
    markProcessed(branch: string, prId: string): Promise<void>;
}

interface CommentsJobBufferDocument extends CommentsJobBuffer {
    _id: string;
}

export class MongoCommentJobBufferPersistanceLayer implements CommentJobBufferPersistanceLayer {
    private static readonly collectionName = "comments_job_buffers";
    private static ensureIndexPromise: Promise<void> | null = null;

    async bufferComment(comment: PullRequestCommentPayload): Promise<void> {
        const collection = await this.getCollection();
        const now = Date.now();
        const bufferId = this.toBufferId(comment.branch, comment.prId);

        await collection.updateOne(
            { _id: bufferId },
            {
                $set: {
                    branch: comment.branch,
                    prId: comment.prId,
                    processed: false,
                    updatedAt: now
                },
                $setOnInsert: {
                    createdAt: now
                },
                $push: {
                    comments: comment
                }
            },
            { upsert: true }
        );
    }

    async findUnprocessedBuffersOlderThan(cutoffTimestamp: number): Promise<CommentsJobBuffer[]> {
        const collection = await this.getCollection();
        const docs = await collection
            .find({
                processed: false,
                updatedAt: { $lte: cutoffTimestamp }
            })
            .toArray();

        return docs.map((doc) => ({
            branch: doc.branch,
            prId: doc.prId,
            comments: Array.isArray(doc.comments) ? doc.comments : [],
            processed: doc.processed === true,
            createdAt: typeof doc.createdAt === "number" ? doc.createdAt : 0,
            updatedAt: typeof doc.updatedAt === "number" ? doc.updatedAt : 0
        }));
    }

    async markProcessed(branch: string, prId: string): Promise<void> {
        const collection = await this.getCollection();
        await collection.updateOne(
            { _id: this.toBufferId(branch, prId) },
            {
                $set: {
                    processed: true,
                    updatedAt: Date.now()
                }
            }
        );
    }

    private toBufferId(branch: string, prId: string): string {
        return `${branch}::${prId}`;
    }

    private async getCollection() {
        const db = await MongoConnectionManager.getDb();
        const collection = db.collection<CommentsJobBufferDocument>(MongoCommentJobBufferPersistanceLayer.collectionName);

        if (!MongoCommentJobBufferPersistanceLayer.ensureIndexPromise) {
            MongoCommentJobBufferPersistanceLayer.ensureIndexPromise = Promise.all([
                collection.createIndex({ processed: 1, updatedAt: 1 }, { name: "processed_updatedAt_asc" }),
                collection.createIndex({ branch: 1, prId: 1 }, { name: "branch_prId_asc" })
            ]).then(() => undefined);
        }

        await MongoCommentJobBufferPersistanceLayer.ensureIndexPromise;
        return collection;
    }
}
