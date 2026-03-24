type LlmInterface = {
    validateLlmResponse(input: string, systemInstructions: string): Promise<string | null>
    agent<T>(input: string, systemInstructions: string): Promise<null | T>
    buildAgent<T>(input: string, instructions: string): Promise<T | null>
}


export default LlmInterface;
