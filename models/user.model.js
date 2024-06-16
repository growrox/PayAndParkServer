import { Schema, model } from "mongoose";

const userSchema = new Schema({
     name: { type: String, required: true },
     code: { type: String, required: true, unique: true },
     phone: { type: String, required: true, unique: true },
     parkingAssistants: [{ type: Schema.Types.ObjectId, ref: 'User' }],
     role: { type: String, required: true, enum: ["assitance", "accountant", "supervisor"] }
});

const User = model('User', userSchema);