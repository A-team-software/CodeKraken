import { Runner } from "@/app/brain/runner/runner";

import { TrelloCard, TrelloProjectManagerAdapter } from "./trello-project-manager-adapter";
import { BaseProjectManagerTaskProcessor, RunnerTaskConfig } from "./base-project-manager-task-processor";
import { WebhookInvocation } from "./task-processor";

type TrelloWebhookPayload = {
    action?: {
        type?: string;
        data?: {
            card?: {
                id?: string;
                name?: unknown;
                desc?: unknown;
                idList?: string;
                closed?: boolean;
            };
        };
    };
};

export class TrelloTaskProcessor extends BaseProjectManagerTaskProcessor<TrelloCard> {
    constructor(runner: Runner, adapter: TrelloProjectManagerAdapter, runnerTaskConfig: RunnerTaskConfig) {
        super(runner, adapter, runnerTaskConfig);
    }

    protected parseRemoteTaskFromWebhook(invocation: WebhookInvocation): TrelloCard {
        const body = invocation.body as TrelloWebhookPayload;
        const action = body?.action;
        const card = action?.data?.card;

        if (action?.type !== "createCard" || !card?.id || !card.name) {
            throw new Error("Invalid Trello webhook payload: expected createCard action with card.id and card.name.");
        }

        return {
            id: card.id,
            name: this.normalizeText(card.name),
            desc: this.normalizeText(card.desc),
            idList: card.idList,
            closed: card.closed
        };
    }
}
