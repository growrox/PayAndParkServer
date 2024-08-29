import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema({
     latitude: { type: String, required: true },
     longitude: { type: String }
})

const attendanceSchema = new mongoose.Schema({
     userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
     shiftId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shift', required: true },
     clockInTime: { type: Date, required: true },
     clockOutTime: { type: Date },
     isLateToday: { type: Boolean, default: false },
     clockInLocation: { type: addressSchema, required: true },
     clockOutLocation: { type: addressSchema }
}, { timestamps: true, versionKey: false });

const Attendance = mongoose.model('Attendance', attendanceSchema);

export default Attendance;
