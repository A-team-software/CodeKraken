import { SafeExecute } from "@/packages/utils/dist/errors/safe_execute";
import { promptLLM } from "./dir";
import { extractJsonFromString } from "./validation";




const validateLlmResponse = async (input: string, systemInstructions: string): Promise<string | null> => {
    // prompt LLM
    const [llmResponse, error] = await SafeExecute.withSync(promptLLM, input, systemInstructions);

    // Error handling
    if (error !== null) {
        console.error(error);
        return null;
    }

    if (!(llmResponse)) {
        return null;
    }

    if (llmResponse["candidates"] === undefined) {
        console.dir(llmResponse, { depth: Infinity, colors: true });
        return null
    }
    const answer: string = llmResponse["candidates"][0]["content"]["parts"][0]["text"];
    return answer;
}

const agent = async <T>(input: string, systemInstructions: string): Promise<null | T> => {

    const answer = await validateLlmResponse(input, systemInstructions);

    if (answer === null) {
        return null;
    }

    const formattedData = extractJsonFromString(answer);

    if (formattedData === null) {
        console.error(`Failed to parse LLM response to json: ${answer}.`);
        return null;
    }

    try {
        // Check if the formatted data is a valid JSON string
        // Parse the JSON string to an object
        if (formattedData) {
            const parsedAs: T = JSON.parse(formattedData);
            return parsedAs;
        }
        console.error("Something went wrong while parsing the LLM response.");
        return null;
    } catch (error: any) {
        console.error(error);
        return null;
    }
}


const LLM = {
    agent: agent,
    validateLlmResponse: validateLlmResponse,
} as const;
export default LLM;
