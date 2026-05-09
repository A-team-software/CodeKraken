import { describe, expect, it } from "vitest";

import { PlanProcessor } from "./plan-processor";

describe("PlanProcessor", () => {
	it("retrieves todos and selects the next actionable item", () => {
		const processor = new PlanProcessor();
		const plan = [
			"todos:",
			"    - id: todo-1",
			"      content: First step",
			"      status: completed",
			"    - id: todo-2",
			"      content: Second step",
			"      status: pending"
		].join("\n");

		expect(processor.getTodos(plan)).toEqual([
			{ id: "todo-1", content: "First step", status: "completed" },
			{ id: "todo-2", content: "Second step", status: "pending" }
		]);

		expect(processor.selectTodoForIteration(plan, [
			{
				todoItemId: "plan",
				result: { success: true, message: "planned" },
				createdAt: new Date(),
				updatedAt: new Date()
			},
			{
				todoItemId: "todo-1",
				prId: "12",
				result: { success: true, message: "done" },
				createdAt: new Date(),
				updatedAt: new Date()
			}
		])).toEqual({ id: "todo-2", content: "Second step", status: "pending" });
	});

	it("marks the matching todo as completed in the stored plan", () => {
		const processor = new PlanProcessor();
		const plan = [
			"todos:",
			"    - id: todo-1",
			"      content: First step",
			"      status: pending"
		].join("\n");

		expect(processor.markTodoAsCompleted(plan, "todo-1")).toBe([
			"todos:",
			"    - id: todo-1",
			"      content: First step",
			"      status: completed"
		].join("\n"));
	});
});
