import { Schema, model } from "mongoose";

const vehicleTypeSchema = new Schema({
  name: { type: String, required: true },
  image: { type: String, required: true },
  hourlyPrices: [{ hour: Number, price: Number }],
}, { timestamps: true, versionKey: false });

const VehicleType = model("VehicleType", vehicleTypeSchema);

export default VehicleType;
