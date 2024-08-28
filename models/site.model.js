// Site Model
import mongoose from 'mongoose';


const siteSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String },
    createdAt: { type: Date, default: Date.now }
});

const Site = mongoose.model('Site', siteSchema);

export default Site;