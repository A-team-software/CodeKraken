// src/config/config.ts (adjust path as needed)

import dotenv from 'dotenv';
import path from 'path'; // To reliably locate the .env file
import { Logger } from '@oliver/utils'; // Assuming Logger is correctly imported

// --- Explicitly load .env file using dotenv ---
// Determine the path to the root .env file relative to this config file's location.
// If config.ts is in apps/api/src/config/, then the root is usually two levels up.
const envPath = path.resolve(__dirname, '../../../.env'); // Adjust '../../.env' if needed

const loadResult = dotenv.config({ path: envPath });

if (loadResult.error) {
    // Log a warning if the .env file couldn't be loaded.
    // The getEnvVar function below will handle throwing errors for *required* variables.
    Logger.logWarn(`Warning: Error loading .env file from ${envPath}: ${loadResult.error.message}`);
    Logger.logWarn('Will rely on system environment variables.');
} else {
    Logger.logInfo(`.env file loaded successfully from ${envPath}`);
    // For debugging, uncomment carefully (don't log secrets):
    // console.log('Parsed dotenv vars:', loadResult.parsed);
}
// --- End of dotenv loading ---


/**
 * Retrieves an environment variable from process.env and optionally throws an error if required and missing.
 * NOTE: Uses process.env, which dotenv populates by default.
 *
 * @param key The name of the environment variable.
 * @param required If true, throws an error if the variable is missing or empty. Defaults to true.
 * @returns The value of the environment variable if found and required.
 * @throws Error if the variable is required but missing or empty.
 */
function getEnvVar(key: string, required = true): string {
    // process.env values are always string | undefined
    const value = process.env[key];
    // console.log(`Checking process.env[${key}]:`, value); // Temporary debug log if needed

    if (required && (value === undefined || value === null || value.trim() === '')) {
        const errorMessage = `Missing or empty required environment variable: ${key}`;
        Logger.logError(errorMessage);
        // Throw an error to halt execution if critical config is missing
        throw new Error(errorMessage);
    }
    // If required, we know value is a non-empty string here due to the check above.
    return value as string;
}

/**
 * Retrieves an optional environment variable from process.env.
 *
 * @param key The name of the environment variable.
 * @param defaultValue An optional default value to return if the variable is not set.
 * @returns The value of the environment variable, or the default value, or undefined.
 */
function getOptionalEnvVar(key: string, defaultValue?: string): string | undefined {
    return process.env[key] ?? defaultValue;
}


// Define the configuration object (structure remains the same, functions now use process.env)
export const config = {
    // GitHub specific config
    github: {
        GITHUB_BASE_BRANCH: getOptionalEnvVar('GITHUB_BASE_BRANCH', 'main'),
        GITHUB_CLIENT_ID: getEnvVar('GITHUB_CLIENT_ID'),
        GITHUB_CLIENT_SECRET: getEnvVar('GITHUB_CLIENT_SECRET'),
        GITHUB_CALLBACK_URL: getEnvVar('GITHUB_CALLBACK_URL'),
        GITHUB_SCOPES: getOptionalEnvVar('GITHUB_SCOPES', 'repo user:email'),
    },
    // App Secret
    APP_SECRET: getEnvVar('APP_SECRET'),
    // AI Config - Removed for brevity, add back if needed
    // db config
    db: {
        mongoUri: getEnvVar('MONGO_DB_URI'),
        dbName: getEnvVar('DB_NAME'),
    },
    // redis config
    redis: {
        url: getEnvVar('REDIS_URL'),
    },
    // auth config
    auth: {
        cookieSecret: getEnvVar('COOKIE_SECRET'),
        sessionCookieName: getEnvVar('SESSION_COOKIE_NAME'),
        accessTokenCookieName: getEnvVar('ACCESS_TOKEN_COOKIE_NAME'),
    },
    // temp dir
    tempDir: './temp', // Or getOptionalEnvVar('TEMP_DIR', './temp')
};

// --- Post-Construction Validations ---
// Example: Validate AI keys if re-added
// if (!config.ai.openaiApiKey && !config.ai.groqApiKey) { ... throw ... }


Logger.logInfo("Configuration loaded and validated successfully using dotenv/process.env.");
