import { Schema, model, models, Document, Model } from 'mongoose'
import { UserInterface } from '../interfaces/user';


const UserModelSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    phoneNumber: {
        type: String,
        required: true,
        unique: false,
    }
}, { timestamps: true })


export const User = (models.User as Model<UserInterface>) || model<UserInterface>('User', UserModelSchema);
