// import { Account } from '@/entities/account';
import { Schema, model, models, Model } from 'mongoose'
import { Account } from '../interfaces/account';




const AccountSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    profilePicture: {
        type: String,
        required: false,
        default: "https://www.gravatar.com/avatar",
    },
    permissions: {
        type: Array,
        required: true,
    },
    role: {
        type: Array,
        required: true,
    },
    firstTime: {
        type: Boolean,
        require: true,
    }
}, { timestamps: true })


export const DBAccount: Model<Account> =
    models.Accounts || model<Account>('Accounts', AccountSchema);
