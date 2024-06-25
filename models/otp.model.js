import { Schema, model } from "mongoose";

const OtpSchema = new Schema({
     userID: { type: Schema.Types.ObjectId, ref: 'users', required: true },
     phoneNumber: { type: String, required: true },
     OTP: { type: String, required: true, default: "786786" },
     attempts: { type: Number, default: 3 },
     expires_on: { type: String }
}, { timestamps: true, versionKey: false });

const Otp = model('otp', OtpSchema);

export default Otp