import { JobDocument, JobPersistenceLayer, JobStep } from "./job-persistence-layer";
import { PlanProcessor } from "./plan-processor";
import { JobConfig, JobResult } from "../shared";
import { MongoConnectionManager } from "@oliver/db";

export class MongoJobPersistenceLayer implements JobPersistenceLayer {
	private static readonly collectionName = "runner_jobs";
	private static ensureIndexPromise: Promise<void> | null = null;
	private readonly planProcessor = new PlanProcessor();

	async saveJob(jobId: string, data: { config?: JobConfig; result?: JobResult | null; plan?: string; prId?: string; todoItemId?: string; isIncremental?: boolean }): Promise<void> {
		const collection = await this.getCollection();
		const now = new Date();
		const existing = await collection.findOne(
			{ _id: jobId },
			{ projection: { isIncremental: 1, plan: 1, steps: 1 } }
		) as Record<string, unknown> | null;
		const isIncremental = data.isIncremental !== undefined
			? data.isIncremental
			: existing?.isIncremental === true;
		const existingSteps = Array.isArray(existing?.steps) ? (existing?.steps as JobStep[]) : [];
		const effectiveTodoItemId = data.todoItemId ?? (data.plan !== undefined && !data.prId ? "plan" : undefined);

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
		} else if (typeof existing?.plan === "string" && effectiveTodoItemId && effectiveTodoItemId !== "plan" && data.result?.success === true) {
			setFields.plan = this.planProcessor.markTodoAsCompleted(existing.plan, effectiveTodoItemId);
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
				...(effectiveTodoItemId ? { todoItemId: effectiveTodoItemId } : {}),
				result: data.result,
				...(data.prId ? { prId: data.prId } : {}),
				createdAt: now,
				updatedAt: now
			};

			if (isIncremental) {
				if (effectiveTodoItemId) {
					const existingIndex = existingSteps.findIndex(existingStep => existingStep.todoItemId === effectiveTodoItemId);
					if (existingIndex >= 0) {
						const existingStep = existingSteps[existingIndex];
						const nextSteps = [...existingSteps];
						nextSteps[existingIndex] = {
							...existingStep,
							result: data.result,
							...(data.prId ? { prId: data.prId } : {}),
							updatedAt: now
						};
						setFields.steps = nextSteps;
					} else {
						setFields.steps = [...existingSteps, step];
					}
				} else {
					console.warn(`MongoJobPersistenceLayer.saveJob: no todoItemId for incremental job '${jobId}'. Step will be appended without deduplication.`);
					setFields.steps = [...existingSteps, step];
				}
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
			id: typeof doc._id === "string" ? doc._id : String(doc._id),
			config: doc.config as JobConfig | undefined,
			result: latestResult ?? null,
			plan: typeof doc.plan === "string" ? doc.plan : undefined,
			steps,
			isIncremental: doc.isIncremental === true
		};
	}
}
