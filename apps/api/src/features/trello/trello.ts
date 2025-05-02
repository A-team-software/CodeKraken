// server/services/trelloService.ts
import { config } from '../../env_config';
import { Logger } from '@oliver/utils';
import { TrelloCard } from './interfaces/trello_card';
import TrelloInterface from './interfaces/trello';

const TRELLO_API_BASE = 'https://api.trello.com/1';




async function getCardDetails(cardId: string, apiKey: string, apiToken: string): Promise<TrelloCard | null> {
    const url = `${TRELLO_API_BASE}/cards/${cardId}?key=${apiKey}&token=${apiToken}`;
    Logger.logInfo(`Fetching Trello card details for ID: ${cardId}`);

    try {
        const response = await fetch(url);
        if (!response.ok) {
            const errorText = await response.text();
            Logger.logError(`Trello API error (${response.status}): ${errorText}`);
            throw new Error(`Failed to fetch Trello card ${cardId}. Status: ${response.status}`);
        }
        const cardData: TrelloCard = await response.json();
        Logger.logInfo(`Successfully fetched Trello card: ${cardData.name}`);
        return cardData;
    } catch (error: any) {
        Logger.logError(`Error in getCardDetails for ${cardId}, ${error.message}`);
        return null; // Return null or re-throw depending on desired handling
    }
}

// Optional: Add function to move card, add comment, etc.
async function addCommentToCard(cardId: string, text: string, apiKey: string): Promise<boolean> {
    const url = `${TRELLO_API_BASE}/cards/${cardId}/actions/comments?text=${encodeURIComponent(text)}&key=${apiKey}&token=${"trello.apiToken"}`;
    Logger.logInfo(`Adding comment to Trello card ID: ${cardId}`);
    try {
        const response = await fetch(url, { method: 'POST' });
        if (!response.ok) {
            const errorText = await response.text();
            Logger.logError(`Trello API comment error (${response.status}): ${errorText}`);
            return false;
        }
        Logger.logInfo(`Successfully added comment to Trello card: ${cardId}`);
        return true;
    } catch (error: any) {
        Logger.logError(`Error adding comment to ${cardId}:, ${error.message}`);
        return false;
    }
}


export const Trello: TrelloInterface = {
    addCommentToCard,
    getCardDetails,
}
