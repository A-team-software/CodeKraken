// server/utils/logger.ts (Simple example)
const logInfo = (...args: any[]) => {
    console.log(`[INFO] ${new Date().toISOString()}:`, ...args);
}
const logError = (...args: any[]) => {
    console.error(`[ERROR] ${new Date().toISOString()}:`, ...args);
}
const logWarn = (...args: any[]) => {
    console.warn(`[WARN] ${new Date().toISOString()}:`, ...args);
}
export const Logger = {
    logInfo,
    logError,
    logWarn,
} as const

