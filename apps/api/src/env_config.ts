// server/config.ts
import { Logger } from '@oliver/utils';
// import { bun } from 'bun';
// Bun automatically loads .env in development, but explicit loading is safer for production builds
// If needed: import 'dotenv/config';
import dotenv from 'dotenv';
import path from 'path'; // Optional, if .env is not in the root

// Load .env file from the project root relative to the current file
// Adjust the path if necessary
const envPath = path.resolve(__dirname, '../.env'); // Assumes server/index.ts is two levels down from root
const environmentVariables = dotenv.config({ path: envPath });
if (environmentVariables.error) {
    console.error('Error loading .env file:', environmentVariables.error);
    // Decide if you should exit if .env is critical
    // process.exit(1);
} else {
    console.log('.env file loaded successfully via dotenv package.');
    // console.log(result.parsed);
    // You can optionally log loaded variables (be careful not to log secrets)
    // console.log('Loaded vars via dotenv:', result.parsed);
}

if (!environmentVariables.parsed) {
    process.exit(1);
}

const env = environmentVariables.parsed;

function getEnvVar(key: string | undefined, required = true): string | undefined {

    if (!key && required) {
        Logger.logError(`Missing required environment variable: ${key}`);
        // Depending on severity, you might want to throw or exit
        // throw new Error(`Missing required environment variable: ${key}`);
        // process.exit(1); // Exit if critical config is missing
    }
    return key;
}


export const config = {
    trello: {
        apiKey: env["TRELLO_API_KEY"],
        apiToken: env["TRELLO_API_TOKEN"],
    },
    github: {
        baseBranch: env["GITHUB_BASE_BRANCH"] || 'main',
        // OAuth App credentials for USER authentication
        clientId: getEnvVar(env["GITHUB_CLIENT_ID"], true),
        clientSecret: getEnvVar(env["GITHUB_CLIENT_SECRET"], true),
        callbackUrl: getEnvVar(env["GITHUB_CALLBACK_URL"], true),
        scopes: getEnvVar(env["GITHUB_SCOPES"], true) || 'repo user:email', // Default scopes
    },
    appSecret: getEnvVar(env["APP_SECRET"], true), // For session/cookie signing
    ai: {
        // Add logic here to check which key is present if supporting both
        openaiApiKey: env["OPENAI_API_KEY"],
        groqApiKey: env["GROQ_API_KEY"],
        // You might want a check here to ensure at least one AI key is set
    },
    // Add any other config like temporary directory path if needed
    tempDir: './server/temp', // Make sure this exists and is writable / .gitignored
};

// Validate that at least one AI key is present
// if (!config.ai.openaiApiKey && !config.ai.groqApiKey) {
//     Logger.logError('Missing AI configuration: Set either OPENAI_API_KEY or GROQ_API_KEY in .env');
//     process.exit(1);
// }

Logger.logInfo("Configuration loaded successfully.");

