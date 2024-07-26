import mongoose from 'mongoose';

const shiftSchema = new mongoose.Schema({
     name: { type: String, required: true },
     startTime: { type: String, required: true },
     endTime: { type: String, required: true }
}, { timestamps: true, versionKey: false });

const Shift = mongoose.model('Shift', shiftSchema);

export default Shift;
