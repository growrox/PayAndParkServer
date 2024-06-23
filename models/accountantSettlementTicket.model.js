import { Schema, model } from "mongoose";

const expenseSchema = new Schema({
     description: { type: String, required: true },
     amount: { type: Number, required: true }
});

const accountantSettlementSchema = new Schema({
     supervisor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
     accountant: { type: Schema.Types.ObjectId, ref: 'User', required: true },
     settlementDate: { type: Date, default: Date.now },
     totalCollectedAmount: { type: Number, required: true },
     expenseDetail: expenseSchema,
     isClosed: { type: Boolean, default: false }
}, { timestamps: true });

const AccountantSettlement = model('AccountantSettlement', accountantSettlementSchema);

export default AccountantSettlement;
