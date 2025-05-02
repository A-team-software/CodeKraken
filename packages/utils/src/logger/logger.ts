import { inspect } from 'bun';

const logInfo = (...args: any[]) => {
    if (process.env.NODE_ENV === "development") {
        console.log(`[INFO] ${new Date().toISOString()}:`, ...args);
    }
}
const logError = (error: any) => {
    if (process.env.NODE_ENV === "development") {
        console.log(inspect(error, { depth: Infinity, colors: true, }));
    }
}
const logWarn = (args: string) => {
    if (process.env.NODE_ENV === "development") {
        console.warn(`[WARN] ${new Date().toISOString()}:`, ...args);
    }
}
export const Logger = {
    logInfo,
    logError,
    logWarn,
} as const

