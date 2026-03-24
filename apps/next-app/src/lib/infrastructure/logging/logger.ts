// Simple logger utility for the providers
const env = process.env.NODE_ENV;
class LoggerService {
    debug(message: string, context?: any) {
        if (env === 'development') {
            console.debug(`[DEBUG] ${message}`, context);
        }
    }

    info(message: string, context?: any) {
        if (env === 'development') {
            console.info(`[INFO] ${message}`, context);
        }
    }

    warn(message: string, context?: any) {
        if (env === 'development') {
            console.warn(`[WARN] ${message}`, context);
        }
    }

    error(message: string, error?: any, context?: any) {
        if (env === 'development') {
            console.error(`[ERROR] ${message}`, error, context);
        }
    }
}

export const Logger = new LoggerService();
