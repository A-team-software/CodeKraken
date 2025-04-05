import { Connection } from "mongoose";

export interface DatabaseClientInterface {
    connect: () => Promise<Connection | null>;
    disconnectFromDatabase: () => Promise<void>;
}
