import { Schema, model } from "mongoose";

const denominationSchema = new Schema({
     denomination: { type: String, required: true }, // Example: "500 INR", "200 INR", "100 INR", "50 INR", "20 INR", "10 INR", "5 INR", etc.
     count: { type: Number, default: 0 }
});

const supervisorSettlementSchema = new Schema({
     supervisor: { type: Schema.Types.ObjectId, ref: 'Supervisor', required: true },
     parkingAssistant: { type: Schema.Types.ObjectId, ref: 'ParkingAssistant', required: true },
     settlementDate: { type: Date, default: Date.now },
     totalCollection: { type: Number, required: true },
     totalCollectedAmount: { type: Number, required: true },
     totalFine: { type: Number, required: true },
     totalReward: { type: Number, required: true },
     cashCollected: [denominationSchema], // Array of denomination objects
     accountantId: { type: String },
     settlementId: {},
     isSettled: { type: Boolean, default: false }
}, { timestamps: true });

const SupervisorSettlementTicket = model('SupervisorSettlementTicket', supervisorSettlementSchema);

export default SupervisorSettlementTicket