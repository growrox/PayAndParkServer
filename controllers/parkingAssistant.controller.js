import ParkingAssistant from '../models/user.model.js'; // Import the ParkingAssistant model
import ParkingTicket from '../models/parkingTicket.model.js';
import mongoose from 'mongoose';


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



// Get the stats of the tickets for the asistant
export const getTicketsStatsByAssistantId = async (req, res) => {
     const parkingAssistant = req.params.assistantId;

     try {
          const pipeline = [
               // Match documents where phoneNumber matches and status is not settled
               { $match: { parkingAssistant: new mongoose.Types.ObjectId(parkingAssistant), status: { $ne: 'settled' } } },

               // Group by null to calculate totals
               {
                    $group: {
                         _id: null,
                         TotalAmount: { $sum: "$amount" },
                         TotalCash: {
                              $sum: {
                                   $cond: [{ $eq: ["$paymentMode", "Cash"] }, "$amount", 0]
                              }
                         },
                         TotalOnline: {
                              $sum: {
                                   $cond: [{ $eq: ["$paymentMode", "Online"] }, "$amount", 0]
                              }
                         },
                    }
               },

               // Optionally project to reshape the output (if needed)
               { $project: { _id: 0, TotalAmount: 1, TotalCash: 1, TotalOnline: 1 } },

          ];

          const pipeline2 = [
               // Match documents where phoneNumber matches and status is not settled
               { $match: { parkingAssistant: new mongoose.Types.ObjectId(parkingAssistant), status: { $ne: 'settled' } } },

               // Sort documents by updatedAt in descending order to find the most recent settled ticket
               { $sort: { updatedAt: -1 } },

               // Limit to 1 document to get the most recent settled ticket
               { $limit: 1 },

               // Project to include the updatedAt field as LastSettledDate
               { $project: { LastSettledDate: "$updatedAt" } },

               // Optionally project to reshape the output (if needed)
               { $project: { _id: 0 } }
          ];

          // Execute the aggregation pipeline
          const results = await ParkingTicket.aggregate(pipeline);
          const results2 = await ParkingTicket.aggregate(pipeline2);
          console.log("results ", results);
          console.log("results2 ", results2);

          // Return the results
          res.json(results.length > 0 ? { message: "Here is the settlements.", data: [{ ...results[0], ...results2[0] }][0] } : { message: "This is a new account or there is no settlements pending.", data: { TotalAmount: 0, TotalCash: 0, TotalOnline: 0, LastSettledDate: null } });
     } catch (error) {
          res.status(500).json({ message: error.message });
     }
};