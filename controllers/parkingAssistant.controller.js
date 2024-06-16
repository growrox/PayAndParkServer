import ParkingAssistant from '../models/parkingAssistant.model.js'; // Import the ParkingAssistant model

// Create a new parking assistant
export const createParkingAssistant = async (req, res) => {
     try {
          const { name, supervisorCode, phone, email, address } = req.body;
          const newAssistant = new ParkingAssistant({ name, supervisorCode, phone, email, address });
          const savedAssistant = await newAssistant.save();
          res.status(201).json(savedAssistant);
     } catch (err) {
          res.status(500).json({ error: err.message });
     }
};

// Get all parking assistants
export const getAllParkingAssistants = async (req, res) => {
     try {
          const assistants = await ParkingAssistant.find();
          res.json(assistants);
     } catch (err) {
          res.status(500).json({ error: err.message });
     }
};

// Get a single parking assistant by ID
export const getParkingAssistantById = async (req, res) => {
     try {
          const assistant = await ParkingAssistant.findById(req.params.id);
          if (!assistant) {
               return res.status(404).json({ error: 'Parking Assistant not found' });
          }
          res.json(assistant);
     } catch (err) {
          res.status(500).json({ error: err.message });
     }
};

// Update a parking assistant by ID
export const updateParkingAssistant = async (req, res) => {
     try {
          const { name, supervisorCode, phone, email, address } = req.body;
          const updatedAssistant = await ParkingAssistant.findByIdAndUpdate(
               req.params.id,
               { name, supervisorCode, phone, email, address },
               { new: true }
          );
          if (!updatedAssistant) {
               return res.status(404).json({ error: 'Parking Assistant not found' });
          }
          res.json(updatedAssistant);
     } catch (err) {
          res.status(500).json({ error: err.message });
     }
};

// Delete a parking assistant by ID
export const deleteParkingAssistant = async (req, res) => {
     try {
          const deletedAssistant = await ParkingAssistant.findByIdAndDelete(req.params.id);
          if (!deletedAssistant) {
               return res.status(404).json({ error: 'Parking Assistant not found' });
          }
          res.json({ message: 'Parking Assistant deleted successfully' });
     } catch (err) {
          res.status(500).json({ error: err.message });
     }
};
