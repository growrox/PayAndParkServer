import ParkingTicket from '../models/parkingTicket.model.js'; // Adjust the path based on your project structure
import ParkingAssistant from "../models/user.model.js"
import { isEmpty } from '../utils/helperFunctions.js';

// Controller to create a new parking ticket
export const createParkingTicket = async (req, res) => {
     try {
          const {
               vehicleType,
               duration,
               paymentMode,
               remark,
               image,
               vehicleNumber,
               phoneNumber,
               amount,
               supervisor,
               settlementId,
               isPass,
               passId
          } = req.body;

          // Check if there is an assistant with the provided phone number and role
          const getAssistant = await ParkingAssistant.findOne({ phone: phoneNumber, role: "assistant" });
          console.log("getAssistant ", getAssistant);
          if (isEmpty(getAssistant)) {
               return res.status(404).json({ message: "Assistant account not found." });
          }

          // Check if assistant is online
          if (!getAssistant.isOnline) {
               return res.status(403).json({ message: "Assistant is not online." });
          }

          // Check if there is already a ticket for the vehicle number created within the last 30 minutes
          const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
          const existingTicket = await ParkingTicket.findOne({
               vehicleNumber,
               createdAt: { $gte: thirtyMinutesAgo }
          });

          if (existingTicket) {
               return res.status(400).json({ message: "A ticket for this vehicle was already created within the last 30 minutes." });
          }

          // Create a new parking ticket
          const newTicket = new ParkingTicket({
               parkingAssistant: getAssistant._id,
               vehicleType,
               duration,
               paymentMode,
               remark,
               image,
               vehicleNumber,
               phoneNumber,
               amount,
               supervisor,
               settlementId,
               isPass,
               passId
          });

          const savedTicket = await newTicket.save();
          res.status(201).json(savedTicket);
     } catch (error) {
          if (error.name === 'ValidationError') {
               // Mongoose validation error
               const errors = Object.values(error.errors).map(err => err.message);
               return res.status(400).json({ message: 'Validation Error', errors });
          }
          res.status(500).json({ message: error.message });
     }
};

// Controller to get all parking tickets
export const getParkingTickets = async (req, res) => {
     try {
          const tickets = await ParkingTicket.find();
          res.json(tickets);
     } catch (error) {
          res.status(500).json({ message: error.message });
     }
};

// Controller to get all the non settle tickets
export const getTicketsByAssistantId = async (req, res) => {
     const phoneNumber = req.params.assistantId;

     try {
          // Query to find all tickets where parkingAssistant's phoneNumber matches
          const tickets = await ParkingTicket.find({
               phoneNumber: phoneNumber,
               paymentMode: { $ne: 'Cash' }, // Payment mode is not 'Cash'
               status: { $ne: 'settled' } // Status is not 'settled'
          });

          // Calculate total count of tickets
          const totalCount = tickets.length;

          // Calculate total cost where paymentMode is not 'Cash' and status is not 'settled'
          let totalCost = 0;
          tickets.forEach(ticket => {
               totalCost += ticket.amount;
          });

          res.json({
               totalCount,
               totalCost,
               tickets
          });
     } catch (error) {
          res.status(500).json({ message: error.message });
     }
};

// Controller to get all the non settle tickets
export const getTicketsStatsByAssistantId = async (req, res) => {
     const phoneNumber = req.params.assistantId;

     try {
          const pipeline = [
               // Match documents where phoneNumber matches and status is not settled
               { $match: { phoneNumber: phoneNumber, status: { $ne: 'settled' } } },

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
                         }
                    }
               },

               // Optionally project to reshape the output (if needed)
               { $project: { _id: 0 } }
          ];

          // Execute the aggregation pipeline
          const results = await ParkingTicket.aggregate(pipeline);

          // Return the results
          res.json(results.length > 0 ? results[0] : { TotalAmount: 0, TotalCash: 0, TotalOnline: 0 });
     } catch (error) {
          res.status(500).json({ message: error.message });
     }
};

// Controller to get a single parking ticket by PhoneNumer or VehicalNumber
export const getParkingTicketByQuery = async (req, res) => {
     const param = req.params.query;

     console.log("Params ",param);
     // Regex patterns for validation
     const phoneNumberRegex = /^\d{10}$/; // Matches exactly 10 digits
     const vehicleNumberRegex = /^[A-Za-z0-9]{1,10}$/; // Matches alphanumeric vehicle number up to 10 characters

     let query;

     // Determine if param is a phone number or vehicle number based on regex matching
     if (phoneNumberRegex.test(param)) {
          query = { phoneNumber: param };
     } else if (vehicleNumberRegex.test(param)) {
          query = { vehicleNumber: param };
     } else {
          return res.status(400).json({ message: 'Invalid query provided.' });
     }

     try {
          const ticket = await ParkingTicket.findOne(query);
               // .populate('parkingAssistant', 'name') // Populate parkingAssistant with 'name' field
               // .populate('supervisor', 'name'); // Populate supervisor with 'name' field

          if (isEmpty(ticket)) {
               return res.status(404).json({ message: 'Parking ticket not found' });
          }

          res.json(ticket);
     } catch (error) {
          res.status(500).json({ message: error.message });
     }
};

// Controller to update a parking ticket by ID
export const updateParkingTicketById = async (req, res) => {
     try {
          const updatedTicket = await ParkingTicket.findByIdAndUpdate(req.params.id, req.body, { new: true });
          if (!updatedTicket) {
               return res.status(404).json({ message: 'Parking ticket not found' });
          }
          res.json(updatedTicket);
     } catch (error) {
          if (error.name === 'ValidationError') {
               // Mongoose validation error
               const errors = Object.values(error.errors).map(err => err.message);
               return res.status(400).json({ message: 'Validation Error', errors });
          }
          res.status(500).json({ message: error.message });
     }
};

// Controller to delete a parking ticket by ID
export const deleteParkingTicketById = async (req, res) => {
     try {
          const deletedTicket = await ParkingTicket.findByIdAndRemove(req.params.id);
          if (!deletedTicket) {
               return res.status(404).json({ message: 'Parking ticket not found' });
          }
          res.json({ message: 'Parking ticket deleted successfully' });
     } catch (error) {
          res.status(500).json({ message: error.message });
     }
};
