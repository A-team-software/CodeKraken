import { SafeExecute } from "@/packages/utils/dist/errors/safe_execute";
import { promptLLM } from "./dir";
import { extractJsonFromString } from "./validation";



const prompt = async (input: string, systemInstructions: string): Promise<any | null> => {
    const [llmResponse, error] = await SafeExecute.withSync(promptLLM, input, systemInstructions);

    if (error !== null) {
        console.log(error);
        return null;
    }
    if (!(llmResponse)) {
        console.log(`res: ${llmResponse} `);
        return null;
    }

    // proc.pid; // process ID of subprocess
    if (llmResponse["candidates"] === undefined) {
        return llmResponse["candidates"];
    }
    const answer = llmResponse["candidates"][0]["content"]["parts"][0]["text"];
    console.dir(answer, { depth: Infinity, colors: true });
    if (!answer) {
        console.dir(answer, { depth: Infinity, colors: true });
        return null;
    }

    return answer;
}


const validateLlmResponse = async (input: string, systemInstructions: string): Promise<string | null> => {
    // prompt LLM
    const [llmResponse, error] = await SafeExecute.withSync(promptLLM, input, systemInstructions);

    // Error handling
    if (error !== null) {
        console.error(error);
        return null;
    }

    if (!(llmResponse)) {
        console.error(`Something wrong happened when prompting the LLM: ${llmResponse}`);
        return null;
    }

    if (llmResponse["candidates"] === undefined) {
        console.dir(llmResponse, { depth: Infinity, colors: true });
        return null
    }
    const answer: string = llmResponse["candidates"][0]["content"]["parts"][0]["text"];
    return answer;
}

const agent = async <T>(input: string, systemInstructions: string): Promise<(Error | null) | T> => {

    const answer = await validateLlmResponse(input, systemInstructions);

    if (answer === null) {

        console.error("Failed to validate LLM response.");

        return null;
    }

    const formattedData = extractJsonFromString(answer);

    if (formattedData === null) {
        console.error("Failed to parse LLM response to json. Body mismatch.");
        return null;
    }

    try {
        // Check if the formatted data is a valid JSON string
        if (typeof formattedData !== "string") {
            console.error("The formatted data is not a valid JSON string.");
            return null;
        }
        // Parse the JSON string to an object
        const parsedAs: T = JSON.parse(formattedData);
        return parsedAs;
    } catch (error: any) {
        console.error(error);
        return new Error(error);
    }
}


const LLM = {
    agent: agent,
} as const;
export default LLM;
