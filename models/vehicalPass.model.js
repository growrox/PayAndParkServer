import mongoose, { Schema } from 'mongoose';

// Define a schema for VehiclePass collection
const VehiclePassSchema = new Schema({
     name: { type: String, required: true },
     phone: { type: String, required: true },
     vehicleNo: { type: String, required: true },
     vehicleType: { type: String, required: true },
     vehicleModel: { type: String, required: true },
     vehicleColor: { type: String, required: true },
     isActive: { type: Boolean, default: true },
     passExpiryDate: { type: Date, required: true },
     insuranceExpiryDate: { type: Date, required: true },
}, { timestamps: true, versionKey: false });

// Create a model based on the schema
const VehiclePass = mongoose.model('VehiclePass', VehiclePassSchema);

export default VehiclePass;
