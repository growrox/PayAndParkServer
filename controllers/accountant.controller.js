import User from '../models/user.model.js'; // Import the ParkingAssistant model
import mongoose from 'mongoose';
import { isEmpty } from '../utils/helperFunctions.js';
import SupervisorSettlementTicket from '../models/settlementTicket.model.js';
import AccountantSettlementTicket from '../models/accountantSettlementTicket.model.js';
import moment from "moment-timezone";
import { responses } from '../utils/Translate/accountant.response.js';
import { getLanguage } from '../utils/helperFunctions.js';

export const settleSupervisorTickets = async (req, res) => {
     const { accountantID, totalCollectedAmount } = req.body;
     const { supervisorID } = req.params;
     console.log("accountantID ", accountantID);
     const language = getLanguage(req, responses);
     try {
          // Fetch non-settled parking tickets with paymentMode as Cash and matching parkingAssistantID

          const findSupervisor = await User.findById(supervisorID);
          if (isEmpty(findSupervisor)) {
               return res.status(404).json({ error: responses.errors[language].supervisorNotFound });
          }


          const findAccountant = await User.findById(accountantID);
          if (isEmpty(findAccountant)) {
               return res.status(404).json({ error: responses.errors[language].accountantNotFound });
          }



          const pipeline = [
               // Match documents where phoneNumber matches and status is not settled
               { $match: { supervisor: new mongoose.Types.ObjectId(supervisorID), isSettled: false } },

               // Group by null to calculate totals
               {
                    $group: {
                         _id: null,
                         TotalCollectedAmount: { $sum: "$totalCollectedAmount" },
                         TotalFine: { $sum: "$totalFine" },
                         TotalReward: { $sum: "$totalReward" },
                         TotalTicketsCount: { $sum: 1 }
                    }
               },

               // Optionally project to reshape the output (if needed)
               { $project: { _id: 0, TotalCollectedAmount: 1, TotalFine: 1, TotalReward: 1, TotalTicketsCount: 1 } },

          ];

          let ticketsToSettle = await SupervisorSettlementTicket.aggregate(pipeline);
          ticketsToSettle = ticketsToSettle ? ticketsToSettle[0] : [];
          console.log("ticketsToSettle ", ticketsToSettle);

          if (isEmpty(ticketsToSettle)) {
               const lastUpdated = await SupervisorSettlementTicket.findOne({ supervisor: new mongoose.Types.ObjectId(supervisorID), 'isSettled': true }, { updatedAt: 1 }).sort({ updatedAt: -1 })
               return res.status(200).json({ message: responses.errors[language].noNonSettledTickets, lastSettled: isEmpty(lastUpdated) ? null : new Date(lastUpdated.updatedAt) });
          }

          // Create a new settlement ticket
          const settlementTicket = new AccountantSettlementTicket({
               supervisor: new mongoose.Types.ObjectId(supervisorID),
               accountant: new mongoose.Types.ObjectId(accountantID),
               totalCollectedAmount
          });

          // Save the new settlement ticket
          const savedSettlement = await settlementTicket.save();

          // Execute all update tickets
          // const UpdatedTicketStatus = await ParkingTicket.aggregate(updateStatusPipeline).exec();
          console.log("savedSettlement ", savedSettlement);

          await SupervisorSettlementTicket.updateMany(
               {
                    supervisor: new mongoose.Types.ObjectId(supervisorID),
                    isSettled: false,
               },
               {
                    $set: {
                         isSettled: true,
                         accountantId: accountantID, // Add supervisorId (assuming supervisorId is a variable)
                         settlementId: savedSettlement._id // Add settlementId (assuming settlementId is a variable)
                    }
               });

          await AccountantSettlementTicket.updateOne(
               {
                    _id: new mongoose.Types.ObjectId(savedSettlement._id),
                    isClosed: false
               },
               {
                    $set: {
                         isClosed: true
                    }
               });

          return res.json({ message: responses.messages[language].ticketsSettledSuccess, result: { settlementId: savedSettlement._id } });
     } catch (error) {
          console.error("Error settling the supervisor tickets.", error);
          return res.status(500).json({ error: error.message });
     }
}

export const getSupervisors = async (req, res) => {
     const { searchQuery, page = 1, pageSize = 10 } = req.query; // Extract search query, page, and pageSize from query params

     // Determine language from headers, default to 'en'
     const language = getLanguage(req, responses);


     try {
          // Step 1: Prepare the match condition for supervisors
          const matchCondition = {
               role: "supervisor"
          };

          // If search query is provided, add regex conditions to match name, phone, or code
          if (searchQuery) {
               matchCondition.$or = [
                    { name: { $regex: searchQuery, $options: 'i' } },
                    { phone: { $regex: searchQuery, $options: 'i' } },
                    { code: { $regex: searchQuery, $options: 'i' } }
               ];
          }

          // Step 2: Count total supervisors matching the match condition
          const totalCount = await User.countDocuments(matchCondition);

          if (totalCount === 0) {
               return res.status(404).json({ error: responses.errors[language].noSupervisorFound });
          }

          // Step 3: Get list of supervisors matching the match condition with pagination
          const supervisorsList = await User.find(matchCondition, { name: 1, phone: 1, code: 1 })
               .sort({ createdAt: -1 })
               .skip((page - 1) * parseInt(pageSize))
               .limit(parseInt(pageSize));

          // Step 4: Iterate through supervisors and fetch aggregated data from SupervisorSettlementTicket
          const supervisorsWithStats = await Promise.all(supervisorsList.map(async (supervisor) => {
               const supervisorId = supervisor._id;

               // Aggregate pipeline to sum up totals for each supervisor
               const statsPipeline = [
                    {
                         $match: {
                              supervisor: supervisorId,
                              isSettled: false
                         }
                    },
                    {
                         $group: {
                              _id: null,
                              totalFine: { $sum: '$totalFine' },
                              cashCollected: { $sum: '$cashCollected' },
                              totalReward: { $sum: '$totalReward' },
                              totalCollectedAmount: { $sum: '$totalCollectedAmount' },
                         }
                    }
               ];

               const supervisorStats = await SupervisorSettlementTicket.aggregate(statsPipeline);

               // Find the last settlement date for the supervisor
               const lastSettlement = await AccountantSettlementTicket.findOne({ supervisor: supervisorId })
                    .sort({ createdAt: -1 }) // Sort by createdAt in descending order to get the latest settlement
                    .select('createdAt');

               return {
                    _id: supervisor._id,
                    name: supervisor.name,
                    phone: supervisor.phone,
                    code: supervisor.code,
                    totalFine: supervisorStats.length > 0 ? supervisorStats[0].totalFine : 0,
                    cashCollected: supervisorStats.length > 0 ? supervisorStats[0].cashCollected : 0,
                    totalReward: supervisorStats.length > 0 ? supervisorStats[0].totalReward : 0,
                    totalCollectedAmount: supervisorStats.length > 0 ? supervisorStats[0].totalCollectedAmount : 0,
                    lastSettledDate: lastSettlement ? lastSettlement.createdAt : null, // Date of the last settlement
               };
          }));

          // Step 5: Calculate total pages based on pageSize
          const totalPages = Math.ceil(totalCount / parseInt(pageSize));

          return res.status(200).json({
               message: responses.messages[language].supervisorListWithStats,
               result: {
                    supervisors: supervisorsWithStats,
                    pagination: {
                         totalCount,
                         totalPages,
                         currentPage: parseInt(page),
                         pageSize: parseInt(pageSize)
                    }
               }
          });

     } catch (error) {
          console.error("Error getting the supervisors with stats.", error);
          return res.status(500).json({ error: error.message });
     }
};


export const getAllSettlementTickets = async (req, res) => {
     const { accountantID } = req.params;
     const { page = 1, pageSize = 10, startDate, endDate, searchQuery } = req.query; // Extract page, pageSize, and searchQuery from query params
     console.log("pageSize  ", pageSize);
     const language = getLanguage(req, responses);

     try {
          console.log("accountantID ", accountantID);
          if (isEmpty(accountantID)) {
               return res.status(404).json({ error: responses.errors[language].noAccountantId });
          }

          const query = {
               accountant: new mongoose.Types.ObjectId(accountantID)
          };

          // Date filter logic
          if (startDate || endDate) {
               const dateRange = {};
               if (startDate) {
                    const LocalStartDate = moment.tz(new Date(startDate), 'Asia/Kolkata').startOf('day').clone().utc();
                    dateRange.$gte = new Date(LocalStartDate);
               }
               if (endDate) {
                    const LocalEndDate = moment.tz(new Date(endDate), 'Asia/Kolkata').endOf('day').clone().utc();
                    const end = new Date(LocalEndDate)
                    dateRange.$lte = end;
               }
               query.createdAt = dateRange;
               console.log("createdAt filter date ", query.createdAt)
          }
          // Aggregate pipeline
          const pipeline = [
               { $match: query },
               {
                    $lookup: {
                         from: 'users', // Collection name
                         localField: 'supervisor', // Field in the tickets collection
                         foreignField: '_id', // Field in the users collection
                         as: 'supervisorDetails'
                    }
               },
               { $unwind: { path: '$supervisorDetails', preserveNullAndEmptyArrays: true } },
               {
                    $lookup: {
                         from: 'users', // Collection name
                         localField: 'accountant', // Field in the tickets collection
                         foreignField: '_id', // Field in the users collection
                         as: 'accountantDetails'
                    }
               },
               { $unwind: { path: '$accountantDetails', preserveNullAndEmptyArrays: true } },
               {
                    $project: {
                         _id: 1,
                         totalCollectedAmount: 1,
                         createdAt: 1,
                         supervisorName: { $ifNull: ['$supervisorDetails.name', 'Unknown'] },
                         supervisorPhone: { $ifNull: ['$supervisorDetails.phone', 'Unknown'] },
                         accountantName: { $ifNull: ['$accountantDetails.name', 'Unknown'] },
                    }
               },
               ...(searchQuery ? [{
                    $match: {
                         $or: [
                              { 'supervisorName': { $regex: searchQuery, $options: 'i' } },
                              { 'supervisorPhone': { $regex: searchQuery, $options: 'i' } }
                         ]
                    }
               }] : []),
               { $sort: { createdAt: -1 } },
               { $skip: (page - 1) * pageSize },
               { $limit: parseInt(pageSize) }
          ];
          console.log('pipeline ', pipeline);

          // Aggregate to count total documents matching the query
          const totalCount = await AccountantSettlementTicket.aggregate([
               ...pipeline,
               { $count: 'totalCount' }
          ]);

          const totalPages = Math.ceil((totalCount.length > 0 ? totalCount[0].totalCount : 0) / pageSize);

          // Aggregate to get the tickets based on the query
          const result = await AccountantSettlementTicket.aggregate(pipeline);

          console.log("Result ", result.length);
          if (isEmpty(result)) {
               return res.status(200).json({ message: responses.errors[language].noNonSettledTickets, result: [] });
          } else {
               // Calculate the total collected amount
               const totalCollectedAmount = result.reduce((total, current) => total + current.totalCollectedAmount, 0);

               // Pagination logic to determine next and previous pages
               let nextPage = null;
               let prevPage = null;

               if (page < totalPages) {
                    nextPage = {
                         page: parseInt(page) + 1,
                         pageSize: parseInt(pageSize),
                    };
               }

               if (page > 1) {
                    prevPage = {
                         page: parseInt(page) - 1,
                         pageSize: parseInt(pageSize),
                    };
               }

               // Prepare response object with tickets, pagination details, and totalCount
               const response = {
                    tickets: result,
                    pagination: {
                         totalCount: totalCount.length > 0 ? totalCount[0].totalCount : 0,
                         totalPages,
                         nextPage,
                         prevPage,
                    },
                    stats: { totalCollectedAmount }
               };

               return res.status(200).json({ message: responses.messages[language].settlementTicketList, result: response });
          }

     } catch (error) {
          console.error("Error getting all tickets.", error);
          return res.status(500).json({ error: error.message });
     }
};


export const getAllSettlementTicketsBySupervisor = async (req, res) => {
     const { supervisorID } = req.params;
     const { page = 1, pageSize = 10 } = req.query; // Extract page and pageSize from query params

     // Determine language from headers, default to 'en'
     const language = getLanguage(req, responses);


     try {
          console.log("supervisorID ", supervisorID);
          if (!supervisorID) {
               return res.status(404).json({ error: responses.errors[language].noSupervisorIdProvided });
          }

          // Check if supervisor exists
          const findSupervisor = await User.findOne({
               _id: new mongoose.Types.ObjectId(supervisorID),
               role: "supervisor"
          });

          if (!findSupervisor) {
               return res.status(404).json({ error: responses.errors[language].supervisorNotFound });
          }

          const pipeline = [
               // Stage 1: Match documents by supervisorID and isSettled condition
               { $match: { supervisor: new mongoose.Types.ObjectId(supervisorID), isSettled: { $ne: true } } },

               // Stage 2: Project to get desired fields
               { $project: { totalCollection: 1, totalCollectedAmount: 1, isSettled: 1, totalFine: 1, totalReward: 1 } },
               { $sort: { createdAt: -1 } },
               // Stage 3: Pagination
               { $skip: (page - 1) * parseInt(pageSize) },
               { $limit: parseInt(pageSize) }
          ];

          // Execute the aggregation pipeline
          const result = await SupervisorSettlementTicket.aggregate(pipeline).exec();

          console.log("Result ", result);

          // Count total documents matching the query (excluding pagination)
          const totalCount = await SupervisorSettlementTicket.countDocuments({
               supervisor: new mongoose.Types.ObjectId(supervisorID),
               isSettled: { $ne: true }
          });

          // Calculate total pages based on pageSize
          const totalPages = Math.ceil(totalCount / pageSize);

          return res.status(200).json({
               message: responses.messages[language].listOfTickets,
               result: {
                    tickets: result.length === 0 ? [] : result,
                    pagination: {
                         totalCount,
                         totalPages,
                         currentPage: parseInt(page),
                         pageSize: parseInt(pageSize)
                    }
               }
          });

     } catch (error) {
          console.error("Error getting all tickets.", error);
          return res.status(500).json({ error: error.message });
     }
};


export const getAccountantStats = async (req, res) => {
     const accountantID = req.params.accountantID;

     // Determine language from headers, default to 'en'
     const language = getLanguage(req, responses);

     try {
          // Get the start and end of today in client's timezone (Asia/Kolkata)
          const clientDate = moment.tz(new Date(), 'Asia/Kolkata');
          const startOfDay = clientDate.startOf('day');
          const startOfTomorrow = startOfDay.clone().add(1, 'day');

          const today = startOfDay.toISOString();
          const tomorrow = startOfTomorrow.toISOString();

          // Find AccountantSettlementTicket for today
          const todayAccountantSettlementTicket = await AccountantSettlementTicket.find({
               accountant: new mongoose.Types.ObjectId(accountantID),
               createdAt: {
                    $gte: today,
                    $lte: tomorrow
               }
          });

          if (!todayAccountantSettlementTicket.length) {
               return res.status(404).json({ error: responses.errors[language].noAccountantSettlementTicketFound });
          }

          // Extract all settlement IDs
          const settlementIds = todayAccountantSettlementTicket.map(ticket => ticket._id);

          // Aggregate stats from SupervisorSettlementTicket where settlementId matches any of the settlementIds
          const statsPipeline = [
               {
                    $match: {
                         settlementId: { $in: settlementIds },
                         isSettled: true // Assuming isSettled is a boolean field
                    }
               },
               {
                    $group: {
                         _id: null,
                         totalCollection: { $sum: '$totalCollection' },
                         totalCollectedAmount: { $sum: '$totalCollectedAmount' },
                         totalFine: { $sum: '$totalFine' },
                         totalReward: { $sum: '$totalReward' },
                         cashCollected: { $sum: '$cashCollected' },
                         cashCollection: { $sum: '$cashCollection' },
                         onlineCollection: { $sum: '$onlineCollection' },
                    }
               }
          ];

          const supervisorStats = await SupervisorSettlementTicket.aggregate(statsPipeline);

          // Extracting values from the aggregation result
          const totalCollection = supervisorStats[0]?.totalCollection || 0;
          const totalCollectedAmount = supervisorStats[0]?.totalCollectedAmount || 0;
          const totalFine = supervisorStats[0]?.totalFine || 0;
          const totalReward = supervisorStats[0]?.totalReward || 0;
          const cashCollected = supervisorStats[0]?.cashCollected || 0;
          const cashCollection = supervisorStats[0]?.cashCollection || 0;
          const onlineCollection = supervisorStats[0]?.onlineCollection || 0;


          // Prepare response
          const response = {
               totalCollection,
               totalCollectedAmount,
               totalFine,
               totalReward,
               cashCollected,
               cashCollection,
               onlineCollection,
               LastSettledTicketUpdatedAt: todayAccountantSettlementTicket[todayAccountantSettlementTicket.length - 1].updatedAt // Assuming updatedAt field provides the last settled time
          };

          return res.status(200).json({
               message: responses.messages[language].accountantStats,
               result: response
          });

     } catch (error) {
          console.error('Error getting the accountant stats.', error);
          return res.status(500).json({ error: responses.errors[language].serverError });
     }
};



export const getAccountantStatsBetweenTwoDates = async (req, res) => {
     const accountantID = req.params.accountantID;
     const { startDate, endDate } = req.query;

     // Determine language from headers, default to 'en'
     const language = getLanguage(req, responses);

     try {
          // Get the start and end dates in client's timezone (Asia/Kolkata)
          const clientStartDate = moment.tz(new Date(startDate), 'Asia/Kolkata');
          const clientEndDate = moment.tz(new Date(endDate), 'Asia/Kolkata');
          const startOfDay = clientStartDate.startOf('day');
          const endOfDay = clientEndDate.endOf('day');

          const startOfDayISO = startOfDay.toISOString();
          const endOfDayISO = endOfDay.toISOString();

          // Find AccountantSettlementTicket within the date range
          const accountantSettlementTickets = await AccountantSettlementTicket.find({
               accountant: new mongoose.Types.ObjectId(accountantID),
               createdAt: {
                    $gte: startOfDayISO,
                    $lte: endOfDayISO
               }
          });

          if (!accountantSettlementTickets.length) {
               return res.status(200).json({
                    message: responses.messages[language].noStatsFound,
                    result: []
               });
          }

          // Extract all settlement IDs
          const settlementIds = accountantSettlementTickets.map(ticket => ticket._id);

          // Aggregate stats from SupervisorSettlementTicket where settlementId matches any of the settlementIds
          const statsPipeline = [
               {
                    $match: {
                         settlementId: { $in: settlementIds }
                    }
               },
               {
                    $group: {
                         _id: null,
                         totalCollection: { $sum: '$totalCollection' },
                         totalCollectedAmount: { $sum: '$totalCollectedAmount' },
                         totalFine: { $sum: '$totalFine' },
                         totalReward: { $sum: '$totalReward' },
                         cashCollected: { $sum: '$cashCollected' }
                    }
               }
          ];

          const supervisorStats = await SupervisorSettlementTicket.aggregate(statsPipeline);

          // Extract values from the aggregation result
          const totalCollection = supervisorStats[0]?.totalCollection || 0;
          const totalCollectedAmount = supervisorStats[0]?.totalCollectedAmount || 0;
          const totalFine = supervisorStats[0]?.totalFine || 0;
          const totalReward = supervisorStats[0]?.totalReward || 0;
          const cashCollected = supervisorStats[0]?.cashCollected || 0;

          // Prepare response
          const response = {
               totalCollection,
               totalCollectedAmount,
               totalFine,
               totalReward,
               cashCollected,
               LastSettledTicketUpdatedAt: accountantSettlementTickets[accountantSettlementTickets.length - 1].updatedAt // Assuming updatedAt field provides the last settled time
          };

          return res.status(200).json({
               message: responses.messages[language].accountantStats,
               result: response
          });

     } catch (error) {
          console.error('Error getting the accountant stats.', error);
          return res.status(500).json({ error: responses.errors[language].serverError });
     }
};

