import { JobPersistenceLayer } from "./job-persistence-layer";
import { JobConfig, JobResult } from "../shared";
import { MongoConnectionManager } from "@oliver/db";

interface JobDocument {
	_id: string;
	config?: JobConfig;
	result: JobResult | null;
	createdAt: Date;
	updatedAt: Date;
}

export class MongoJobPersistenceLayer implements JobPersistenceLayer {
	private static readonly collectionName = "runner_jobs";
	private static ensureIndexPromise: Promise<void> | null = null;

	async saveJob(jobId: string, data: { config?: JobConfig; result?: JobResult | null }): Promise<void> {
		const collection = await this.getCollection();
		const now = new Date();
		const setFields: Record<string, unknown> = {
			updatedAt: now
		};

		if (data.config !== undefined) {
			setFields.config = data.config;
		}

		if (data.result !== undefined) {
			setFields.result = data.result;
		}

		await collection.updateOne(
			{ _id: jobId },
			{
				$set: setFields,
				$setOnInsert: {
					createdAt: now
				}
			},
			{ upsert: true }
		);
	}

	async getJob(jobId: string): Promise<{ config?: JobConfig; result: JobResult | null; } | null> {
		const collection = await this.getCollection();
		const doc = await collection.findOne({ _id: jobId });

		if (!doc) {
			return null;
		}

		return {
			config: doc.config,
			result: doc.result
		};
	}

	async deleteJob(jobId: string): Promise<void> {
		const collection = await this.getCollection();
		await collection.deleteOne({ _id: jobId });
	}

	private async getCollection() {
		const db = await MongoConnectionManager.getDb();
		const collection = db.collection<JobDocument>(MongoJobPersistenceLayer.collectionName);

		if (!MongoJobPersistenceLayer.ensureIndexPromise) {
			MongoJobPersistenceLayer.ensureIndexPromise = collection.createIndex({ updatedAt: -1 }, { name: "updatedAt_desc" }).then(() => undefined);
		}

		await MongoJobPersistenceLayer.ensureIndexPromise;
		return collection;
	}
}
