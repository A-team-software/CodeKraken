import { Task } from "../types/task";
import { ProjectManagerAdapter } from "./project-manager-adapter";

export interface TrelloCard {
    id: string;
    name: string;
    desc?: string | null;
    idList?: string;
    closed?: boolean;
}

export interface TrelloProjectManagerAdapter extends ProjectManagerAdapter<TrelloCard> {
    remoteTaskToLocalTask(card: TrelloCard): Task;
}

export class TrelloProjectManagerAdapterImpl implements TrelloProjectManagerAdapter {
    remoteTaskToLocalTask(card: TrelloCard): Task {
        return {
            id: card.id,
            type: card.closed ? "trello-closed-card" : "trello-card",
            summary: card.name,
            description: card.desc ?? ""
        };
    }
}
