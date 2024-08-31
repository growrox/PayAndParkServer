import mongoose from 'mongoose';

const ticketSequenceSchema = new mongoose.Schema({
     date: { type: String, required: true, unique: true }, // Format YYYY-MM-DD
     sequence: { type: Number, required: true }
});

const TicketSequence = mongoose.model('TicketSequence', ticketSequenceSchema);

export default TicketSequence;
