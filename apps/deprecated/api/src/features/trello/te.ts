
// --- Configuration ---
// Load your Trello API Key from environment variables for security
const TRELLO_API_KEY = process.env.TRELLO_API_KEY;
const TRELLO_API_BASE_URL = "https://api.trello.com/1";

if (!TRELLO_API_KEY) {
    console.error("FATAL ERROR: TRELLO_API_KEY environment variable is not set.");
    // Consider exiting or throwing a fatal error in a real application
    // process.exit(1);
}

// --- Interfaces (for Type Safety) ---
interface TrelloCard {
    id: string;
    name: string;
    desc: string;
    idBoard: string;
    idList: string;
    // Add other relevant card properties as needed
    [key: string]: any; // Allow for other properties
}

interface CreateCardData {
    idList: string; // Mandatory for creating a card
    name?: string;
    desc?: string;
    pos?: 'top' | 'bottom' | number;
    due?: string | null; // ISO 8601 format or null
    idMembers?: string[];
    // Add other creatable fields as needed
}

interface UpdateCardData {
    name?: string;
    desc?: string;
    closed?: boolean;
    idList?: string;
    idBoard?: string;
    pos?: 'top' | 'bottom' | number;
    due?: string | null;
    idMembers?: string[];
    // Add other updateable fields as needed
}

// --- Core API Request Function ---

/**
 * Handles making requests to the Trello API, including authentication
 * and basic error handling.
 * @param userToken - The OAuth token for the user.
 * @param endpoint - The Trello API endpoint (e.g., '/boards/{id}/cards').
 * @param method - HTTP method ('GET', 'POST', 'PUT', 'DELETE').
 * @param body - Optional request body for POST/PUT requests.
 * @returns Promise<any> - The JSON response from the Trello API.
 * @throws {Error} - Throws an error if the API request fails.
 */
async function trelloApiRequest(
    userToken: string,
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    body?: object
): Promise<any> {
    if (!userToken) {
        throw new Error("User Trello token is required.");
    }
    if (!TRELLO_API_KEY) {
        // This check is slightly redundant due to the top-level check,
        // but good practice within the core function.
        throw new Error("Server configuration error: Trello API Key is missing.");
    }

    const url = `${TRELLO_API_BASE_URL}${endpoint}?key=${TRELLO_API_KEY}&token=${userToken}`;

    const options: RequestInit = {
        method: method,
        headers: {},
    };

    if (body && (method === 'POST' || method === 'PUT')) {
        options.headers = {
            ...options.headers,
            'Content-Type': 'application/json',
            'Accept': 'application/json', // Be explicit about wanting JSON back
        };
        options.body = JSON.stringify(body);
    } else if (method === 'GET' || method === 'DELETE') {
        options.headers = {
            ...options.headers,
            'Accept': 'application/json',
        }
    }


    console.debug(`Making Trello API Request: ${method} ${url}`); // Debug logging

    try {
        const response = await fetch(url, options);

        // Trello might return plain text errors for some auth issues
        const contentType = response.headers.get("content-type");
        let responseBody;

        if (contentType && contentType.includes("application/json")) {
            // Only attempt to parse as JSON if the header indicates it
            // Handle potential empty responses (e.g., 204 No Content) if applicable
            if (response.status !== 204) {
                responseBody = await response.json();
            } else {
                responseBody = null; // Or an appropriate representation for no content
            }
        } else {
            // Handle non-JSON responses (likely errors)
            responseBody = await response.text();
        }


        if (!response.ok) {
            // Log detailed error information
            console.error(`Trello API Error: Status ${response.status}, Endpoint: ${endpoint}, Response:`, responseBody);
            // Construct a more informative error message
            const errorMessage = `Trello API request failed with status ${response.status}: ${typeof responseBody === 'string' ? responseBody : JSON.stringify(responseBody)}`;
            const error = new Error(errorMessage);
            // Attach status code for potential specific handling later
            (error as any).statusCode = response.status;
            (error as any).responseBody = responseBody; // Attach response body if needed
            throw error;
        }

        console.debug(`Trello API Success: ${method} ${endpoint}, Status: ${response.status}`);
        return responseBody;

    } catch (error: any) {
        // Catch fetch errors (network issues) and re-throw or handle
        console.error(`Error during fetch to Trello API: ${error.message}`, error);
        // Re-throw the original error or a new wrapped error
        throw new Error(`Failed to communicate with Trello API: ${error.message}`);
    }
}

// --- Service Functions ---

/**
 * Fetches all cards from a specific Trello board.
 * @param userToken - The OAuth token for the user.
 * @param boardId - The ID of the Trello board.
 * @returns Promise<TrelloCard[]> - An array of card objects.
 */
export async function getBoardCards(userToken: string, boardId: string): Promise<TrelloCard[]> {
    if (!boardId) {
        throw new Error("Board ID is required to fetch cards.");
    }
    const endpoint = `/boards/${boardId}/cards`;
    // Add query parameters for filtering if needed, e.g. &fields=id,name,desc
    // const endpoint = `/boards/${boardId}/cards?fields=id,name,desc,idList`;
    return trelloApiRequest(userToken, endpoint, 'GET');
}

/**
 * Creates a new card on a specific Trello list.
 * @param userToken - The OAuth token for the user.
 * @param cardData - Object containing card details (must include idList).
 * @returns Promise<TrelloCard> - The newly created card object.
 */
export async function createCard(userToken: string, cardData: CreateCardData): Promise<TrelloCard> {
    if (!cardData || !cardData.idList) {
        throw new Error("Card data with idList is required to create a card.");
    }
    const endpoint = '/cards';
    return trelloApiRequest(userToken, endpoint, 'POST', cardData);
}

/**
 * Updates an existing Trello card.
 * @param userToken - The OAuth token for the user.
 * @param cardId - The ID of the card to update.
 * @param updateData - Object containing the fields to update.
 * @returns Promise<TrelloCard> - The updated card object.
 */
export async function updateCard(userToken: string, cardId: string, updateData: UpdateCardData): Promise<TrelloCard> {
    if (!cardId) {
        throw new Error("Card ID is required to update a card.");
    }
    if (!updateData || Object.keys(updateData).length === 0) {
        throw new Error("Update data cannot be empty.");
    }
    const endpoint = `/cards/${cardId}`;
    return trelloApiRequest(userToken, endpoint, 'PUT', updateData);
}

// --- Example Usage (within your BunJS server routes) ---
/*
// Example in an Elysia or other Bun framework route handler

import { getBoardCards, createCard, updateCard } from './trelloService';

// Assuming you have obtained userToken from a secure session/auth mechanism
const userToken = getUserTokenFromRequest(request); // Placeholder function
const boardId = 'YOUR_TARGET_BOARD_ID'; // Should likely come from request or config
const listIdForNewCards = 'YOUR_TARGET_LIST_ID'; // Needed for creation

// Get cards
try {
    const cards = await getBoardCards(userToken, boardId);
    console.log('Fetched Cards:', cards);
    // return cards to client
} catch (error) {
    console.error('Failed to fetch cards:', error);
    // return error response to client
}

// Create a card
try {
    const newCardData: CreateCardData = {
        idList: listIdForNewCards,
        name: 'New Card from App',
        desc: 'This card was created via the API.'
    };
    const createdCard = await createCard(userToken, newCardData);
    console.log('Created Card:', createdCard);
    // return success response
} catch (error) {
     console.error('Failed to create card:', error);
    // return error response
}

// Update a card
try {
    const cardIdToUpdate = 'AN_EXISTING_CARD_ID'; // Should come from request
    const cardUpdateData: UpdateCardData = {
        desc: 'Updated description via the API.',
        due: null // Remove due date
    };
    const updatedCard = await updateCard(userToken, cardIdToUpdate, cardUpdateData);
    console.log('Updated Card:', updatedCard);
    // return success response
} catch (error) {
     console.error('Failed to update card:', error);
    // return error response
}

*/
