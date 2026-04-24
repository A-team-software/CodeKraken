/**
 * Database Initialization Module
 * 
 * Handles centralized MongoDB connection initialization at app startup.
 * This ensures the database is ready before any request handlers execute.
 */

import { MongoConnectionManager } from './db/mongodb/client';

let initialized = false;
let initPromise: Promise<void> | null = null;

/**
 * Initialize the database connection at app startup.
 * Safe to call multiple times - only initializes once.
 */
export async function initializeAppDatabase(): Promise<void> {
    // Return existing promise if initialization is in progress
    if (initPromise) {
        return initPromise;
    }

    // Return early if already initialized
    if (initialized) {
        return;
    }

    // Set up initialization promise
    initPromise = (async () => {
        try {
            const manager = MongoConnectionManager.getInstance();
            await manager.connect();

            // Verify DB health at startup
            const ok = await manager.ping();

            if (!ok) {
                throw new Error('MongoDB health check failed');
            }

            console.log('✅ MongoDB initialized and ready');
            initialized = true;
        } catch (error) {
            console.error('❌ Failed to initialize MongoDB:', error);
            throw error;
        }
    })();

    await initPromise;
}
