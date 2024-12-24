import { Schema, model } from "mongoose";

const userSchema = new Schema(
  {
    name: { type: String, required: true },
    code: { type: String }, // This is only required filed for a supervisor
    supervisorCode: { type: String }, // This is only required filed for a assistant
    phone: { type: String, required: true, unique: true },
    role: {
      type: String,
      required: true,
      enum: ["assistant", "accountant", "supervisor", "superadmin"],
    },
    password: { type: String },
    isOnline: { type: Boolean, default: false },
    isActivated: { type: Boolean, default: true },
    shiftId: { type: Schema.Types.ObjectId, ref: "Shift" },
    siteId: { type: Schema.Types.ObjectId, ref: "Site" },
    lastSettledTicketId: {
      type: Schema.Types.ObjectId,
      ref: "SupervisorSettlementTicket",
    },
    isUserDisable: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false }
);

const User = model("User", userSchema);

export default User;
