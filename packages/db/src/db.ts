import { Model } from 'mongoose'
import DBInterface from './interfaces/db';
import { Logger } from "@oliver/utils";

import { ObjectId } from 'mongodb';
import { SafeExecute } from '@oliver/utils';


const finOne = async <T>(criteria: string | number, model: Model<T>): Promise<T | null> => {
    try {
        const result = await model.findOne({ criteria });
        if (result === null) {

            return null;
        }
        return result;
    } catch (e: any) {
        Logger.logError(e);
        return null;
    }
}

const create = async <T, K>(document: K | number, model: Model<T>): Promise<T | null> => {
    // { writeConcern: { w: 1 } }
    const result = await model.create(document);
    console.log()
    if (result == null) {
        Logger.logError("Error creating document");
        return null
    };

    Logger.logInfo(`Document created successfully: ${result}`);
    return result;

}




export const DB: DBInterface = {
    findOne: finOne,
    create: create,
} as const;

