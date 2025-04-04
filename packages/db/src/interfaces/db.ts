import { Model } from 'mongoose';

interface DBInterface {
    findOne: <T>(criteria: string | number, model: Model<T>) => Promise<T | null>;
    create: <T, K>(document: K | number, model: Model<T>) => Promise<T | null>
}

export default DBInterface;
