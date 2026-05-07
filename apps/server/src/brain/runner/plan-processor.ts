import { JobStep } from "./job-persistence-layer";

export interface PlanTodo {
	id: string;
	content: string;
	status: string;
}

export class PlanProcessor {
	getTodos(plan: string): PlanTodo[] {
		const lines = plan.split(/\r?\n/);
		const todos: PlanTodo[] = [];
		let current: Partial<PlanTodo> | null = null;

		for (const line of lines) {
			const todoStart = line.match(/^\s*-\s+id:\s*(.+)\s*$/);
			if (todoStart) {
				if (current?.id && current.content && current.status) {
					todos.push(current as PlanTodo);
				}

				current = { id: todoStart[1].trim() };
				continue;
			}

			const contentMatch = line.match(/^\s+content:\s*(.+)\s*$/);
			if (contentMatch && current) {
				current.content = contentMatch[1].trim();
				continue;
			}

			const statusMatch = line.match(/^\s+status:\s*(.+)\s*$/);
			if (statusMatch && current) {
				current.status = statusMatch[1].trim();
			}
		}

		if (current?.id && current.content && current.status) {
			todos.push(current as PlanTodo);
		}

		return todos;
	}

	selectTodoForIteration(plan: string, steps?: JobStep[]): PlanTodo | null {
		const todos = this.getTodos(plan);
		if (todos.length === 0) {
			return null;
		}

		const implementationSteps = (steps ?? []).filter(step => step.todoItemId && step.todoItemId !== "plan");
		const completedSteps = implementationSteps.filter(step => step.prId);
		if (completedSteps.length === 0) {
			return todos[0];
		}

		const executedTodoIds = new Set(completedSteps.map(step => step.todoItemId));
		return todos.find(todo => !executedTodoIds.has(todo.id)) ?? null;
	}

	markTodoAsCompleted(plan: string, todoItemId: string): string {
		const eol = plan.includes("\r\n") ? "\r\n" : "\n";
		const lines = plan.split(/\r?\n/);
		let matchedTodo = false;

		return lines.map((line) => {
			const todoMatch = line.match(/^(\s*-\s+id:\s*)(.+?)(\s*)$/);
			if (todoMatch) {
				matchedTodo = todoMatch[2].trim() === todoItemId;
				return line;
			}

			if (!matchedTodo) {
				return line;
			}

			const statusMatch = line.match(/^(\s*status:\s*)(.+?)(\s*)$/);
			if (!statusMatch) {
				return line;
			}

			matchedTodo = false;
			return `${statusMatch[1]}completed${statusMatch[3]}`;
		}).join(eol);
	}
}
