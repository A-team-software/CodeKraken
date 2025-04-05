// import { Account } from '@/entities/account';
import { Schema, model, models, Model } from 'mongoose'


export type Account = {
    id: string,
    name: string,
    profilePicture: string,
    permissions: [],
    role: string,
    firstTime: boolean,
}



const AccountSchema = new Schema({
    id: {
        type: String,
        required: true,
        unique: true,
    },
    name: {
        type: String,
        required: true
    },
    profilePicture: {
        type: String,
        required: true
    },
    permissions: {
        type: Array,
        required: true,
    },
    role: {
        type: ["developer", "admin"],
        default: "developer",
        required: true,
    },
    firstTime: {
        type: Boolean,
        require: true,
    }
}, { timestamps: true })


const AccountModel: Model<Account> =
    models?.Accounts || model<Account>('Accounts', AccountSchema);
export default AccountModel;
