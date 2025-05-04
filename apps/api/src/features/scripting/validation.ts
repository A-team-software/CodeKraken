// 3. Function to extract JSON from potential markdown code blocks
export function extractJsonFromString(str: string): string | null {
    const jsonRegex = /\s*```json\s*([\s\S]*?)\s*```\s*/;

    const match = str.match(jsonRegex);

    // If a match is found, the captured JSON string is in match[1]
    if (match && match[1]) {
        return match[1].trim(); // Trim any leading/trailing whitespace from the extracted JSON itself
    }

    // Fallback: Maybe it's just raw JSON without markers?
    // Basic check: Does it seem to start with { and end with } after trimming?
    const trimmedStr = str.trim();
    if (trimmedStr.startsWith('{') && trimmedStr.endsWith('}')) {
        return trimmedStr;
    }

    return null;
}
