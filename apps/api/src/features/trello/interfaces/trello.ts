import { TrelloCard } from './trello_card';
export default interface TrelloInterface {
    addCommentToCard(cardId: string, text: string, apiKey: string): Promise<boolean>;
    getCardDetails(cardId: string, apiKey: string, apiToken: string): Promise<TrelloCard | null>;
}
