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

const create = async <T, K>(document: K | number, model: Model<T>): Promise<T[] | null> => {
    // { writeConcern: { w: 1 } }
    const [result, error] = await SafeExecute.withSync(model.create, document);
    if ((result == null) || error != null) return null;


    return result;

}




const DB: DBInterface = {
    findOne: finOne,
    create: create,
} as const;

export default DB;
