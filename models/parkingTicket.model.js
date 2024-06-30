import { Schema, model } from "mongoose";

const parkingTicketSchema = new Schema({
     parkingAssistant: { type: Schema.Types.ObjectId, ref: 'ParkingAssistant', required: true },
     vehicleType: { type: String, required: true },
     duration: { type: Number, required: true },
     paymentMode: { type: String, enum: ['Cash', 'Online', 'Free'], required: true },
     remark: { type: String },
     image: { type: String },
     vehicleNumber: { type: String, required: true },
     phoneNumber: { type: String, required: true },
     amount: { type: Number, required: true },
     status: { type: String, enum: ['created', 'paid', 'settled'], default: 'created' },
     supervisor: { type: Schema.Types.ObjectId, ref: 'Supervisor' },
     settlementId: { type: Schema.Types.ObjectId, ref: "SupervisorSettlementTicket" },
     isPass: { type: Boolean, default: false },
     passId: { type: Schema.Types.ObjectId, ref: 'Pass' },
     onlineTransactionId: { type: Schema.Types.ObjectId, ref: 'Transaction' }
}, { timestamps: true });

const ParkingTicket = model('ParkingTickets', parkingTicketSchema);

export default ParkingTicket