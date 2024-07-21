import ParkingAssistant from '../models/user.model.js'; // Import the ParkingAssistant model
import ParkingTicket from '../models/parkingTicket.model.js';
import mongoose from 'mongoose';


// Create a new parking assistant
export const createParkingAssistant = async (req, res) => {
     try {
          const { name, supervisorCode, phone, email, address } = req.body;
          const newAssistant = new ParkingAssistant({ name, supervisorCode, phone, email, address });
          const savedAssistant = await newAssistant.save();
          return res.status(201).json({ message: "Assistant account created.", result: savedAssistant });
     } catch (err) {
          return res.status(500).json({ error: err.message });
     }
};

// Get all parking assistants
export const getAllParkingAssistants = async (req, res) => {
     try {
          const assistants = await ParkingAssistant.find();
          return res.json({ message: "data", result: assistants });
     } catch (err) {
          return res.status(500).json({ error: err.message });
     }
};


// Get a single parking assistant by ID
export const getParkingAssistantById = async (req, res) => {
     try {
          const assistant = await ParkingAssistant.findById(req.params.id);
          if (!assistant) {
               return res.status(404).json({ error: 'Parking Assistant not found' });
          }
          return res.json(assistant);
     } catch (err) {
          return res.status(500).json({ error: err.message });
     }
};

// Update a parking assistant by ID
export const updateParkingAssistant = async (req, res) => {
     try {
          const { name, supervisorCode, phone, email, address } = req.body;
          const updatedAssistant = await ParkingAssistant.findByIdAndUpdate(
               req.params.id,
               { name, supervisorCode, phone },
               { new: true }
          );
          if (!updatedAssistant) {
               return res.status(404).json({ error: 'Parking Assistant not found' });
          }
          return res.json({ message: "Details updated", result: updatedAssistant });
     } catch (err) {
          return res.status(500).json({ error: err.message });
     }
};

// Delete a parking assistant by ID
export const deleteParkingAssistant = async (req, res) => {
     try {
          const deletedAssistant = await ParkingAssistant.findByIdAndDelete(req.params.id);
          if (!deletedAssistant) {
               return res.status(404).json({ error: 'Parking Assistant not found' });
          }
          return res.json({ message: 'Parking Assistant deleted successfully' });
     } catch (err) {
          return res.status(500).json({ error: err.message });
     }
};



// Get the stats of the tickets for the asistant
export const getTicketsStatsByAssistantId = async (req, res) => {
     // console.log(req.headers);
     const parkingAssistant = req.headers.userid;
     console.log("parkingAssistant ", parkingAssistant);

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
          return res.json(results.length > 0 ?
               {
                    message: "Here is the settlements.",
                    result: [{ ...results[0], ...results2[0] }][0]
               }
               :
               {
                    message: "This is a new account or there is no settlements pending.",
                    result: { TotalAmount: 0, TotalCash: 0, TotalOnline: 0, LastSettledDate: null }
               });
     } catch (error) {
          return res.status(500).json({ message: error.message });
     }
};


// Controller function to fetch tickets
export const getTickets = async (req, res) => {
     try {
          let { page, userid, pageSize } = req.headers;
          let { searchQuery } = req.query;
          let filter = [];

          console.log(searchQuery, " Query --- ", req.query);

          // Handle pagination and default limit
          const limit = page && page === 'home' ? 5 : parseInt(pageSize) || 20;  // 5 tickets for 'page=home', or custom limit from headers, defaulting to 20
          const pageNumber = parseInt(req.query.page) || 1;
          const skip = (pageNumber - 1) * limit;

          // Apply filters if provided
          if (searchQuery) {
               filter.push({ vehicleNumber: { $regex: new RegExp(searchQuery, 'i') } }); // Case-insensitive regex match
               filter.push({ phoneNumber: { $regex: new RegExp(searchQuery, 'i') } }); // Case-insensitive regex match
               filter.push({ paymentMode: { $regex: new RegExp(searchQuery, 'i') } }); // Case-insensitive regex match
               filter.push({ status: { $regex: new RegExp(searchQuery, 'i') } }); // Case-insensitive regex match
          }

          console.log("filter ", filter);

          let tickets = [];

          if (page === 'home') {
               // Fetch latest 5 tickets without filters
               tickets = await ParkingTicket.find({ parkingAssistant: new mongoose.Types.ObjectId(userid) })
                    .sort({ createdAt: -1 }) // Sort by createdAt descending (latest first)
                    .limit(5)
                    .populate('supervisor', 'name') // Populate supervisor with 'name' field
                    .populate('settlementId') // Populate settlementId with referenced document
                    .populate('passId') // Populate passId with referenced document
                    .populate('onlineTransactionId') // Populate onlineTransactionId with referenced document
                    .exec();
          } else {
               // Fetch tickets with applied filters and pagination
               if (filter.length > 0) {
                    tickets = await ParkingTicket.find({ parkingAssistant: new mongoose.Types.ObjectId(userid), $or: filter })
                         .sort({ createdAt: -1 }) // Sort by createdAt descending (latest first)
                         .skip(skip)
                         .limit(limit)
                         .populate('supervisor', 'name') // Populate supervisor with 'name' field
                         .populate('settlementId') // Populate settlementId with referenced document
                         .populate('passId') // Populate passId with referenced document
                         .populate('onlineTransactionId') // Populate onlineTransactionId with referenced document
                         .exec();
               } else {
                    tickets = await ParkingTicket.find({ parkingAssistant: new mongoose.Types.ObjectId(userid) })
                         .sort({ createdAt: -1 }) // Sort by createdAt descending (latest first)
                         .skip(skip)
                         .limit(limit)
                         .populate('supervisor', 'name') // Populate supervisor with 'name' field
                         .populate('settlementId') // Populate settlementId with referenced document
                         .populate('passId') // Populate passId with referenced document
                         .populate('onlineTransactionId') // Populate onlineTransactionId with referenced document
                         .exec();
               }
          }

          // Count total number of tickets (for pagination details)
          const totalCount = await ParkingTicket.find({ parkingAssistant: new mongoose.Types.ObjectId(userid) }).countDocuments();

          if (tickets.length === 0) {
               return res.status(200).json({ message: 'No tickets found', result: { data: [], pagination: { total: 0, limit, pageNumber } } });
          }

          let responseObj = {
               message: "Here are the parking tickets.",
               result: { data: tickets },
          }
          if (!page && page != 'home') {
               responseObj["result"] = { ...responseObj["result"], pagination: { total: totalCount, limit, pageNumber } }
          }

          return res.status(200).json(responseObj);
     } catch (err) {
          console.error('Error fetching tickets:', err);
          return res.status(500).json({ error: 'Server error' });
     }
};
