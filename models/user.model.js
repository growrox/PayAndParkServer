import { Schema, model } from "mongoose";

const userSchema = new Schema({
  name: { type: String, required: true },
  code: { type: String },
  supervisorCode: { type: String },
  phone: { type: String, required: true, unique: true },
  parkingAssistants: [{ type: Schema.Types.ObjectId, ref: "User" }],
  role: {
    type: String,
    required: true,
    enum: ["assistant", "accountant", "supervisor", "superadmin"],
  },
  password: { type: String },
     isOnline: { type: Boolean, default: false }
});

const User = model("User", userSchema);

export default User;
