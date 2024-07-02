import mongoose, { Schema } from 'mongoose';

// Define a schema for VehiclePass collection
const VehiclePassSchema = new Schema({
     vehicleNo: { type: String, required: true },
     phone: { type: String, required: true },
     expireDate: { type: Date, required: true },
     isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Create a model based on the schema
const VehiclePass = mongoose.model('VehiclePass', VehiclePassSchema);

export default VehiclePass;
