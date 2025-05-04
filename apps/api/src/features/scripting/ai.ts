import { SafeExecute } from "@/packages/utils/dist/errors/safe_execute";
import { promptLLM } from "./dir";



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



const LLM = { prompt: prompt } as const;
export default LLM;
