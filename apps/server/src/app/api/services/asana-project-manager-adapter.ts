import { Task } from "../types/task";
import { ProjectManagerAdapter } from "./project-manager-adapter";

export interface AsanaWorkItem {
    gid: string;
    name: string;
    notes?: string | null;
    resource_type?: string;
    resource_subtype?: string | null;
}

export interface AsanaProjectManagerAdapter extends ProjectManagerAdapter<AsanaWorkItem> {
    remoteTaskToLocalTask(workItem: AsanaWorkItem): Task;
}

export class AsanaProjectManagerAdapterImpl implements AsanaProjectManagerAdapter {
    remoteTaskToLocalTask(workItem: AsanaWorkItem): Task {
        return {
            id: workItem.gid,
            type: workItem.resource_subtype ?? workItem.resource_type ?? "asana",
            summary: workItem.name,
            description: workItem.notes ?? ""
        };
    }
}
