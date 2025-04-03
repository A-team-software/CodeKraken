import { TrelloCard } from './trello_card';
export default interface TrelloInterface {
    addCommentToCard(cardId: string, text: string): Promise<boolean>;
    getCardDetails(cardId: string): Promise<TrelloCard | null>;
}
