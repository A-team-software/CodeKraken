import { Task } from "../types/task";
import { ProjectManagerAdapter } from "./project-manager-adapter";

export interface JiraTicket {
    id: string;
    key: string;
    fields: {
        summary: string;
        description?: string | null;
        issuetype?: {
            id?: string;
            name?: string;
        } | null;
    };
}

export interface JiraProjectManagerAdapter extends ProjectManagerAdapter<JiraTicket> {
    remoteTaskToLocalTask(ticket: JiraTicket): Task;
}

export class JiraProjectManagerAdapterImpl implements JiraProjectManagerAdapter {
    remoteTaskToLocalTask(ticket: JiraTicket): Task {
        return {
            id: ticket.id,
            type: ticket.fields.issuetype?.name ?? "jira",
            summary: ticket.fields.summary,
            description: ticket.fields.description ?? ""
        };
    }
}
