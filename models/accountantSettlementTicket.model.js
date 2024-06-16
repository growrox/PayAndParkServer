import { Schema, model } from "mongoose";

const expenseSchema = new Schema({
     description: { type: String, required: true },
     amount: { type: Number, required: true }
});

const accountantSettlementSchema = new Schema({
     supervisor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
     accountant: { type: Schema.Types.ObjectId, ref: 'User', required: true },
     settlementDate: { type: Date, default: Date.now },
     totalSettledAmount: { type: Number, required: true },
     totalExpenses: { type: Number, default: 0 },
     remarks: { type: String },
     expenses: expenseSchema
});

const AccountantSettlement = model('AccountantSettlement', accountantSettlementSchema);

export default AccountantSettlement;
