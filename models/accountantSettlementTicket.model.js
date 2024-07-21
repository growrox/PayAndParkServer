import { Schema, model } from "mongoose";


const accountantSettlementSchema = new Schema({
     supervisor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
     accountant: { type: Schema.Types.ObjectId, ref: 'User', required: true },
     totalCollectedAmount: { type: Number, required: true }
}, { timestamps: true, versionKey: false });

const AccountantSettlement = model('AccountantSettlement', accountantSettlementSchema);

export default AccountantSettlement;
