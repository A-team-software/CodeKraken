import { JobDocument, JobPersistenceLayer, JobStep } from "./job-persistence-layer";
import { JobConfig, JobResult } from "../shared";
import { MongoConnectionManager } from "@oliver/db";

export class MongoJobPersistenceLayer implements JobPersistenceLayer {
	private static readonly collectionName = "runner_jobs";
	private static ensureIndexPromise: Promise<void> | null = null;

	async saveJob(jobId: string, data: { config?: JobConfig; result?: JobResult | null; plan?: string; prId?: string; isIncremental?: boolean }): Promise<void> {
		const collection = await this.getCollection();
		const now = new Date();
		const existing = await collection.findOne({ _id: jobId }, { projection: { isIncremental: 1 } }) as { isIncremental?: boolean } | null;
		const isIncremental = data.isIncremental !== undefined
			? data.isIncremental
			: existing?.isIncremental === true;

		const setFields: Record<string, unknown> = {
			updatedAt: now
		};

		if (data.config !== undefined) {
			setFields.config = data.config;
		}

		if (data.isIncremental !== undefined) {
			setFields.isIncremental = isIncremental;
		}

		if (data.plan !== undefined) {
			setFields.plan = data.plan;
		}

		if (data.result !== undefined) {
			setFields.result = data.result;
		}

		const update: Record<string, unknown> = {
			$set: setFields,
			$setOnInsert: {
				createdAt: now,
				isIncremental
			}
		};

		if (data.result && typeof data.result === "object") {
			const step: JobStep = {
				result: data.result,
				...(data.prId ? { prId: data.prId } : {}),
				createdAt: now,
				updatedAt: now
			};

			if (isIncremental) {
				update.$push = { steps: step };
			} else {
				setFields.steps = [step];
			}
		}

		await collection.updateOne(
			{ _id: jobId },
			update,
			{ upsert: true }
		);
	}

	async getJob(jobId: string): Promise<JobDocument | null> {
		const collection = await this.getCollection();
		const doc = await collection.findOne({ _id: jobId });
		return this.toJobDocument(doc);
	}

	async findLatestJobByPrId(prId: string): Promise<JobDocument | null> {
		const collection = await this.getCollection();
		const doc = await collection.find({ "steps.prId": prId }).sort({ updatedAt: -1 }).limit(1).next();
		return this.toJobDocument(doc ?? null);
	}

	async deleteJob(jobId: string): Promise<void> {
		const collection = await this.getCollection();
		await collection.deleteOne({ _id: jobId });
	}

	private async getCollection() {
		const db = await MongoConnectionManager.getDb();
		const collection = db.collection<{ _id: string } & Record<string, unknown>>(MongoJobPersistenceLayer.collectionName);

		if (!MongoJobPersistenceLayer.ensureIndexPromise) {
			MongoJobPersistenceLayer.ensureIndexPromise = collection.createIndex({ updatedAt: -1 }, { name: "updatedAt_desc" }).then(() => undefined);
		}

		await MongoJobPersistenceLayer.ensureIndexPromise;
		return collection;
	}

	private toJobDocument(doc: Record<string, unknown> | null): JobDocument | null {
		if (!doc) {
			return null;
		}

		const steps = Array.isArray(doc.steps) ? (doc.steps as JobStep[]) : undefined;
		const latestResult = steps?.length
			? (steps[steps.length - 1]?.result as JobResult | null | undefined)
			: (doc.result as JobResult | null | undefined);

		return {
			id: typeof doc._id === "string" ? doc._id : "",
			config: doc.config as JobConfig | undefined,
			result: latestResult ?? null,
			plan: typeof doc.plan === "string" ? doc.plan : undefined,
			steps,
			isIncremental: doc.isIncremental === true
		};
	}
}
