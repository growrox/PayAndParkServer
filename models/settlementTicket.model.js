import { Schema, model } from "mongoose";

const denominationSchema = new Schema({
     denomination: { type: String, required: true }, // Example: "500 INR", "200 INR", "100 INR", "50 INR", "20 INR", "10 INR", "5 INR", "2 INR","1 INR".
     count: { type: Number, default: 0 }
});

const supervisorSettlementSchema = new Schema({
     supervisor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
     parkingAssistant: { type: Schema.Types.ObjectId, ref: 'User', required: true },
     settlementDate: { type: Date, default: Date.now },
     totalCollection: { type: Number, required: true },
     totalCollectedAmount: { type: Number, required: true },
     totalFine: { type: Number, required: true },
     totalReward: { type: Number, required: true },
     cashComponent: [denominationSchema], // Array of denomination objects [{denomination:500,count:5},{denomination:200,count:5}]]
     cashCollected: { type: Number, required: true },
     accountantId: { type: Schema.Types.ObjectId, ref: 'User'},
     settlementId: { type: Schema.Types.ObjectId, ref: 'AccountantSettlement' },
     isSettled: { type: Boolean, default: false }
}, { timestamps: true, versionKey: false });

const SupervisorSettlementTicket = model('SupervisorSettlementTicket', supervisorSettlementSchema);

export default SupervisorSettlementTicket