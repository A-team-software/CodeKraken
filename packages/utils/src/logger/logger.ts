import { inspect } from 'util';

// server/utils/logger.ts (Simple example)
const logInfo = (...args: any[]) => {
    console.log(`[INFO] ${new Date().toISOString()}:`, ...args);
}
const logError = (error: unknown) => {
    if (process.env.NODE_ENV === "development") {
        console.log(inspect(error, { depth: Infinity, colors: true, numericSeparator: true }));
    }
}
const logWarn = (args: string) => {
    console.warn(`[WARN] ${new Date().toISOString()}:`, ...args);
}
export const Logger = {
    logInfo,
    logError,
    logWarn,
} as const

