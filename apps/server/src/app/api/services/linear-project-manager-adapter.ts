import { Task } from "../types/task";
import { ProjectManagerAdapter } from "./project-manager-adapter";

export interface LinearIssue {
    id: string;
    identifier?: string;
    title: string;
    description?: string | null;
    state?: {
        name?: string;
    } | null;
}

export interface LinearProjectManagerAdapter extends ProjectManagerAdapter<LinearIssue> {
    remoteTaskToLocalTask(issue: LinearIssue): Task;
}

export class LinearProjectManagerAdapterImpl implements LinearProjectManagerAdapter {
    remoteTaskToLocalTask(issue: LinearIssue): Task {
        return {
            id: issue.id,
            type: issue.state?.name ?? "linear-issue",
            summary: issue.identifier ? `${issue.identifier} ${issue.title}` : issue.title,
            description: issue.description ?? ""
        };
    }
}
