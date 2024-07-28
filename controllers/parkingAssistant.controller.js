import ParkingAssistant from '../models/user.model.js'; // Import the ParkingAssistant model
import ParkingTicket from '../models/parkingTicket.model.js';
import mongoose from 'mongoose';
import { getLanguage } from "../utils/helperFunctions.js";
import { responses } from '../utils/Translate/assistant.response.js';

// Create a new parking assistant
export const createParkingAssistant = async (req, res) => {
     const language = getLanguage(req);
     try {
          const { name, supervisorCode, phone, email, address } = req.body;
          const newAssistant = new ParkingAssistant({ name, supervisorCode, phone, email, address });
          const savedAssistant = await newAssistant.save();
          return res.status(201).json({ message: responses.message[language].assistantCreated, result: savedAssistant });
     } catch (err) {
          return res.status(500).json({ error: responses.error[language].serverError });
     }
};

// Get all parking assistants
export const getAllParkingAssistants = async (req, res) => {
     const language = getLanguage(req);
     try {
          const assistants = await ParkingAssistant.find();
          return res.json({ message: responses.message[language].dataFetched, result: assistants });
     } catch (err) {
          return res.status(500).json({ error: responses.error[language].serverError });
     }
};

// Get a single parking assistant by ID
export const getParkingAssistantById = async (req, res) => {
     const language = getLanguage(req);
     try {
          const assistant = await ParkingAssistant.findById(req.params.id);
          if (!assistant) {
               return res.status(404).json({ error: responses.error[language].assistantNotFound });
          }
          return res.json(assistant);
     } catch (err) {
          return res.status(500).json({ error: responses.error[language].serverError });
     }
};

// Update a parking assistant by ID
export const updateParkingAssistant = async (req, res) => {
     const language = getLanguage(req);
     try {
          const { name, supervisorCode, phone } = req.body;
          const updatedAssistant = await ParkingAssistant.findByIdAndUpdate(
               req.params.id,
               { name, supervisorCode, phone },
               { new: true }
          );
          if (!updatedAssistant) {
               return res.status(404).json({ error: responses.error[language].assistantNotFound });
          }
          return res.json({ message: responses.message[language].detailsUpdated, result: updatedAssistant });
     } catch (err) {
          return res.status(500).json({ error: responses.error[language].serverError });
     }
};

// Delete a parking assistant by ID
export const deleteParkingAssistant = async (req, res) => {
     const language = getLanguage(req);
     try {
          const deletedAssistant = await ParkingAssistant.findByIdAndDelete(req.params.id);
          if (!deletedAssistant) {
               return res.status(404).json({ error: responses.error[language].assistantNotFound });
          }
          return res.json({ message: responses.message[language].assistantDeleted });
     } catch (err) {
          return res.status(500).json({ error: responses.error[language].serverError });
     }
};

// Get the stats of the tickets for the assistant
export const getTicketsStatsByAssistantId = async (req, res) => {
     const language = getLanguage(req);
     const parkingAssistant = req.headers.userid;
     try {
          const pipeline = [
               { $match: { parkingAssistant: new mongoose.Types.ObjectId(parkingAssistant), status: { $ne: 'settled' } } },
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
               { $project: { _id: 0, TotalAmount: 1, TotalCash: 1, TotalOnline: 1 } },
          ];

          const pipeline2 = [
               { $match: { parkingAssistant: new mongoose.Types.ObjectId(parkingAssistant), status: { $ne: 'settled' } } },
               { $sort: { updatedAt: -1 } },
               { $limit: 1 },
               { $project: { LastSettledDate: "$updatedAt" } },
               { $project: { _id: 0 } }
          ];

          const results = await ParkingTicket.aggregate(pipeline);
          const results2 = await ParkingTicket.aggregate(pipeline2);

          return res.json(results.length > 0 ?
               {
                    message: responses.message[language].settlementsFetched,
                    result: [{ ...results[0], ...results2[0] }][0]
               }
               :
               {
                    message: responses.message[language].noSettlements,
                    result: { TotalAmount: 0, TotalCash: 0, TotalOnline: 0, LastSettledDate: null }
               });
     } catch (error) {
          return res.status(500).json({ message: responses.error[language].serverError });
     }
};

// Controller function to fetch tickets
export const getTickets = async (req, res) => {
     const language = getLanguage(req);
     try {
          let { page, userid } = req.headers;
          let { searchQuery } = req.query;
          let filter = [];

          const limit = page && page === 'home' ? 5 : parseInt(req.query.pageSize) || 20;
          const pageNumber = parseInt(req.query.page) || 1;
          const skip = (pageNumber - 1) * limit;

          if (searchQuery) {
               filter.push({ vehicleNumber: { $regex: new RegExp(searchQuery, 'i') } });
               filter.push({ phoneNumber: { $regex: new RegExp(searchQuery, 'i') } });
               filter.push({ paymentMode: { $regex: new RegExp(searchQuery, 'i') } });
               filter.push({ status: { $regex: new RegExp(searchQuery, 'i') } });
          }

          let tickets = [];

          if (page === 'home') {
               tickets = await ParkingTicket.find({ parkingAssistant: new mongoose.Types.ObjectId(userid) })
                    .sort({ createdAt: -1 })
                    .limit(5)
                    .populate('supervisor', 'name')
                    .populate('settlementId')
                    .populate('passId')
                    .populate('onlineTransactionId')
                    .exec();
          } else {
               if (filter.length > 0) {
                    tickets = await ParkingTicket.find({ parkingAssistant: new mongoose.Types.ObjectId(userid), $or: filter })
                         .sort({ createdAt: -1 })
                         .skip(skip)
                         .limit(limit)
                         .populate('supervisor', 'name')
                         .populate('settlementId')
                         .populate('passId')
                         .populate('onlineTransactionId')
                         .exec();
               } else {
                    tickets = await ParkingTicket.find({ parkingAssistant: new mongoose.Types.ObjectId(userid) })
                         .sort({ createdAt: -1 })
                         .skip(skip)
                         .limit(limit)
                         .populate('supervisor', 'name')
                         .populate('settlementId')
                         .populate('passId')
                         .populate('onlineTransactionId')
                         .exec();
               }
          }

          const totalCount = await ParkingTicket.find({ parkingAssistant: new mongoose.Types.ObjectId(userid) }).countDocuments();

          if (tickets.length === 0) {
               return res.status(200).json({ message: responses.message[language].noTicketsFound, result: { data: [], pagination: { total: 0, limit, pageNumber } } });
          }

          let responseObj = {
               message: responses.message[language].ticketsFetched,
               result: { data: tickets },
          };
          if (!page && page != 'home') {
               responseObj["result"] = { ...responseObj["result"], pagination: { total: totalCount, limit, pageNumber } }
          }

          return res.status(200).json(responseObj);
     } catch (err) {
          console.error('Error fetching tickets:', err);
          return res.status(500).json({ error: responses.error[language].serverError });
     }
};