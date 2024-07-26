import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
     ticket_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ParkingTickets', },
     razorpay_order_id: { type: String },
     razorpay_payment_id: { type: String },
     razorpay_signature: { type: String },
     order_id: { type: String },
     amount: { type: String }
}, { timestamps: true, versionKey: false });

const Transaction = mongoose.model('Transaction', transactionSchema);

export default Transaction;
