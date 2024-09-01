import User from '../models/user.model.js'; // Import the ParkingAssistant model
import ParkingTicket from '../models/parkingTicket.model.js';
import mongoose from 'mongoose';
import { isEmpty } from '../utils/helperFunctions.js';
import SupervisorSettlementTicket from '../models/settlementTicket.model.js';
import { responses } from '../utils/Translate/supervisor.response.js';
import { getLanguage } from '../utils/helperFunctions.js';
import moment from 'moment-timezone';

export const settleParkingTickets = async (req, res) => {
     const language = getLanguage(req, responses); // Get user's language preference
     const { supervisorID, cashComponent, cashCollected, totalCollection, totalCollectedAmount, TotalFine, TotalRewards } = req.body;
     const { parkingAssistantID } = req.params;

     try {
          if (isEmpty(cashComponent)) {
               return res.status(400).json({
                    error: responses.errors[language].cashComponentsRequired
               });
          }

          // Check if a settlement ticket was created today for this assistant
          const today = new Date();
          today.setHours(0, 0, 0, 0); // Set hours to start of day for comparison

          const existingTicketToday = await SupervisorSettlementTicket.findOne({
               parkingAssistant: parkingAssistantID,
               createdAt: { $gte: today }
          });

          if (existingTicketToday) {
               return res.status(200).json({
                    message: responses.messages[language].ticketsAlreadySettled,
                    result: { settlementId: existingTicketToday._id }
               });
          }

          // Validate cash amount and total
          const calculatedTotalCash = cashComponent.reduce((total, key) => total + +key.denomination * +key.count, 0);
          if (cashCollected !== calculatedTotalCash) {
               return res.status(400).json({
                    error: responses.errors[language].cashAmountMismatch,
                    result: {
                         expectedAmount: cashComponent["Total"],
                         receivedAmount: calculatedTotalCash
                    }
               });
          }

          // Check eligibility for rewards based on total collection and fines
          if ((totalCollection - TotalFine) < 2000 && TotalRewards > 0) {
               return res.status(400).json({ error: responses.errors[language].notEligibleForRewards });
          }
          if ((totalCollection - TotalFine) >= 2000 && TotalRewards !== 200) {
               return res.status(400).json({ error: responses.errors[language].incorrectRewardAmount });
          }

          // Find the parking assistant
          const findAssistant = await User.findById(parkingAssistantID);
          if (isEmpty(findAssistant)) {
               return res.status(404).json({ error: responses.errors[language].assistantNotFound });
          }

          // Aggregate pipeline to calculate totals for unsettled tickets
          const pipeline = [
               { $match: { parkingAssistant: new mongoose.Types.ObjectId(parkingAssistantID), status: { $ne: 'settled' } } },
               {
                    $group: {
                         _id: null,
                         TotalAmount: { $sum: "$amount" },
                         TotalCash: { $sum: { $cond: [{ $eq: ["$paymentMode", "Cash"] }, "$amount", 0] } },
                         TotalOnline: { $sum: { $cond: [{ $eq: ["$paymentMode", "Online"] }, "$amount", 0] } },
                    }
               },
               { $project: { _id: 0, TotalAmount: 1, TotalCash: 1, TotalOnline: 1 } },
          ];

          // Execute aggregation to get unsettled tickets totals
          let ticketsToUpdate = await ParkingTicket.aggregate(pipeline);
          ticketsToUpdate = isEmpty(ticketsToUpdate) ? {
               TotalAmount: 0, TotalCash: 0, TotalOnline: 0
          } : ticketsToUpdate[0];

          if (totalCollectedAmount != (ticketsToUpdate.TotalCash - (TotalFine + TotalRewards))) {
               return res.status(404).json({
                    error: responses.errors[language].collectedAmountMismatch,
                    result: {
                         receivedAmount: totalCollectedAmount,
                         expectedAmount: ticketsToUpdate.TotalCash - (TotalFine + TotalRewards)
                    }
               });
          }

          if ((ticketsToUpdate.TotalCash - (TotalFine + TotalRewards)) > 0 && (ticketsToUpdate.TotalCash - (TotalFine + TotalRewards)) > calculatedTotalCash) {
               return res.status(404).json({
                    error: responses.errors[language].cashCollectionLessThanExpected,
                    result: {
                         receivedCashAmount: calculatedTotalCash,
                         expectedCashAmount: ticketsToUpdate.TotalCash - (TotalFine + TotalRewards)
                    }
               });
          }

          if ((ticketsToUpdate.TotalCash - (TotalFine + TotalRewards)) > 0 && (ticketsToUpdate.TotalCash - (TotalFine + TotalRewards)) < calculatedTotalCash) {
               return res.status(404).json({
                    error: responses.errors[language].cashCollectionMoreThanExpected,
                    result: {
                         receivedCashAmount: calculatedTotalCash,
                         expectedCashAmount: ticketsToUpdate.TotalCash - (TotalFine + TotalRewards)
                    }
               });
          }

          // Create a new settlement ticket
          const settlementTicket = new SupervisorSettlementTicket({
               supervisor: new mongoose.Types.ObjectId(supervisorID),
               parkingAssistant: new mongoose.Types.ObjectId(parkingAssistantID),
               totalCollection,
               totalCollectedAmount,
               totalFine: TotalFine,
               totalReward: TotalRewards,
               cashComponent, // Placeholder for actual logic
               cashCollected,
               accountantId: parkingAssistantID, // Placeholder, adjust as needed
               isSettled: false, // Will be set to true after updating tickets
          });

          // Save the new settlement ticket
          const savedSettlement = await settlementTicket.save();

          // Update status of unsettled tickets
          await ParkingTicket.updateMany(
               {
                    parkingAssistant: new mongoose.Types.ObjectId(parkingAssistantID),
                    status: { $ne: 'settled' }
               },
               {
                    $set: {
                         status: 'settled',
                         supervisor: supervisorID,
                         settlementId: savedSettlement._id
                    }
               }
          );

          // Update last settled ticket ID for the parking assistant
          await User.findByIdAndUpdate(parkingAssistantID, { lastSettledTicketId: savedSettlement._id });

          // Update settlement status to indicate it's settled
          await SupervisorSettlementTicket.updateOne(
               {
                    _id: new mongoose.Types.ObjectId(savedSettlement._id),
                    settled: { $ne: true }
               },
               {
                    $set: { settled: true }
               }
          );

          // Return success response
          return res.json({
               message: responses.messages[language].ticketsSettledSuccessfully,
               result: { settlementId: savedSettlement._id }
          });
     } catch (error) {
          console.error(error);
          return res.status(500).json({ error: responses.errors[language].internalServerError });
     }
};


export const getParkingAssistantsOld = async (req, res) => {
     const { supervisorID } = req.params;
     const { queryParam, shiftID } = req.query; // Extract query parameter from request

     try {
          const supervisor = await User.findById(supervisorID);
          if (isEmpty(supervisor)) {
               return res.status(404).json({ error: 'Supervisor not found' });
          }

          // Construct base query to find assistants by supervisor code
          let query = {
               supervisorCode: supervisor.code
          };

          // If queryParam is provided, add additional filters
          let queryArray = [
               { 'isOnline': queryParam === 'isOnline' }, // Convert string 'true' to boolean true
               { 'phone': { $regex: queryParam } },
               { 'name': { $regex: queryParam } }
          ]

          isEmpty(shiftID) ? console.log("Not query for shift id") : queryArray.push({ 'shiftId': queryParam });
          console.log("queryArray  ", queryArray);


          if (queryParam) {
               query = {
                    ...query,
                    $or: queryArray
               };
          }

          // Query users based on constructed query
          let assistants = await User.find(query, {
               isOnline: 1,
               name: 1,
               phone: 1
          }).populate({
               path: 'shiftId',
               select: 'name startTime endTime',
          }).populate({
               path: 'lastSettledTicketId',
               select: 'updatedAt'
          });

          if (!assistants || assistants.length === 0) {
               return res.status(404).json({ error: 'No assistants found' });
          }

          // Iterate through assistants and fetch amountToCollect for each
          assistants = await Promise.all(assistants.map(async (assistant) => {
               const { isOnline, _id, name, phone, shiftId, lastSettledTicketId } = assistant;

               let amountToCollect = 0;

               // Fetch total amount to collect where payment mode is cash and status is not settled
               if (shiftId) {
                    amountToCollect = await ParkingTicket.aggregate([
                         {
                              $match: {
                                   parkingAssistant: _id,
                                   paymentMode: 'Cash',
                                   status: { $ne: 'settled' }
                              }
                         },
                         {
                              $group: {
                                   _id: null,
                                   totalAmount: { $sum: '$amount' }
                              }
                         }
                    ]);
                    amountToCollect = amountToCollect.length > 0 ? amountToCollect[0].totalAmount : 0;
               }

               return {
                    _id,
                    name,
                    phone,
                    isOnline,
                    lastSettled: isEmpty(lastSettledTicketId) ? null : lastSettledTicketId?.updatedAt,
                    shiftDetails: shiftId ? shiftId : {
                         _id: null,
                         name: null,
                         startTime: null,
                         endTime: null
                    },
                    amountToCollect
               };
          }));

          return res.json({ message: "Here is all your parking assistant list", result: assistants });
     } catch (error) {
          console.error("Error getting parking assistance ", error);
          return res.status(500).json({ error: 'Server Error' });
     }
}

export const getParkingAssistants = async (req, res) => {
     const { supervisorID } = req.params;
     const { queryParam, shiftID, page = 1, pageSize = 10 } = req.query; // Extract query parameters including pagination
     const language = getLanguage(req, responses); // Fallback to English if language is not set

     try {
          // Find the supervisor by ID
          const supervisor = await User.findById(supervisorID);
          if (!supervisor) {
               return res.status(404).json({ error: responses.errors[language].supervisorNotFound });
          }

          // Construct the base query to find assistants by supervisor code
          let query = {
               supervisorCode: supervisor.code
          };

          // Add additional filters based on query parameters
          if (queryParam) {
               query.$or = [];

               // Regex for partial matches and case-insensitive search
               if (/^\d+$/.test(queryParam)) {
                    query.$or.push({ phone: { $regex: queryParam, $options: 'i' } });  // Regex for phone numbers
               } else {
                    query.$or.push({ name: { $regex: queryParam, $options: 'i' } });  // Regex for names
               }

               // Check if queryParam indicates online status
               if (queryParam.toLowerCase() === 'isonline') {
                    query.$or.push({ isOnline: true });
               } else if (queryParam.toLowerCase() === 'isoffline') {
                    query.$or.push({ isOnline: false });
               }
          }

          // Add shiftID filter if provided
          if (shiftID) {
               query.shiftId = shiftID;
          }

          // Query users based on constructed query with pagination
          let assistants = await User.find(query, {
               isOnline: 1,
               name: 1,
               phone: 1,
               shiftId: 1,
               lastSettledTicketId: 1
          })
               .populate({
                    path: 'shiftId',
                    select: 'name startTime endTime',
               })
               .populate({
                    path: 'lastSettledTicketId',
                    select: 'updatedAt'
               })
               .skip((page - 1) * parseInt(pageSize))
               .limit(parseInt(pageSize));

          // If no assistants match the query, return an empty array
          if (assistants.length === 0) {
               return res.json({
                    message: responses.messages[language].noAssistantsFound,
                    result: {
                         assistants: [],
                         pagination: {
                              totalCount: 0,
                              totalPages: 0,
                              currentPage: parseInt(page),
                              pageSize: parseInt(pageSize)
                         }
                    }
               });
          }

          // Iterate through assistants and fetch amountToCollect for each
          assistants = await Promise.all(assistants.map(async (assistant) => {
               const { isOnline, _id, name, phone, shiftId, lastSettledTicketId } = assistant;

               let amountToCollect = 0;

               // Fetch total amount to collect where payment mode is cash and status is not settled
               if (shiftId) {
                    const amountData = await ParkingTicket.aggregate([
                         {
                              $match: {
                                   parkingAssistant: _id,
                                   paymentMode: 'Cash',
                                   status: { $ne: 'settled' }
                              }
                         },
                         {
                              $group: {
                                   _id: null,
                                   totalAmount: { $sum: '$amount' }
                              }
                         }
                    ]);
                    amountToCollect = amountData.length > 0 ? amountData[0].totalAmount : 0;
               }

               return {
                    _id,
                    name,
                    phone,
                    isOnline,
                    lastSettled: lastSettledTicketId ? lastSettledTicketId.updatedAt : null,
                    shiftDetails: shiftId ? shiftId : {
                         _id: null,
                         name: null,
                         startTime: null,
                         endTime: null
                    },
                    amountToCollect
               };
          }));

          // Count total assistants matching the query
          const totalCount = await User.countDocuments(query);

          // Calculate total pages based on pageSize
          const totalPages = Math.ceil(totalCount / parseInt(pageSize));

          return res.json({
               message: responses.messages[language].assistantsFetchedSuccessfully,
               result: {
                    assistants,
                    pagination: {
                         totalCount,
                         totalPages,
                         currentPage: parseInt(page),
                         pageSize: parseInt(pageSize)
                    }
               }
          });
     } catch (error) {
          console.error("Error getting parking assistants ", error);
          return res.status(500).json({ error: responses.errors[language].internalServerError });
     }
};



// export const getAllSettlementTickets = async (req, res) => {
// const { supervisorID } = req.params;
// const { page = 1, pageSize = 10 } = req.query; // Extract page and pageSize from query params

export const getAllSettlementTickets = async (req, res) => {
     const { supervisorID } = req.params;
     const { page = 1, pageSize = 10, startDate, endDate, searchQuery } = req.query;
     const language = getLanguage(req, responses); // Fallback to English if language is not set

     try {
          if (!supervisorID) {
               return res.status(404).json({ error: responses.errors[language].supervisorIdNotFound });
          }

          const query = {
               supervisor: new mongoose.Types.ObjectId(supervisorID)
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
          }

          // Aggregate to filter by accountant name and parking assistant name
          const pipeline = [
               { $match: query },
               {
                    $lookup: {
                         from: 'users',
                         localField: 'accountantId',
                         foreignField: '_id',
                         as: 'accountantDetails'
                    }
               },
               { $unwind: { path: '$accountantDetails', preserveNullAndEmptyArrays: true } },
               {
                    $lookup: {
                         from: 'users',
                         localField: 'parkingAssistant',
                         foreignField: '_id',
                         as: 'parkingAssistantDetails'
                    }
               },
               { $unwind: { path: '$parkingAssistantDetails', preserveNullAndEmptyArrays: true } },
               {
                    $project: {
                         _id: 1,
                         totalCollection: 1,
                         totalCollectedAmount: 1,
                         totalFine: 1,
                         totalReward: 1,
                         createdAt: 1,
                         accountantName: { $ifNull: ['$accountantDetails.name', 'Unknown'] },
                         parkingAssistantName: { $ifNull: ['$parkingAssistantDetails.name', 'Unknown'] },
                    }
               },
               ...(searchQuery ? [{
                    $match: {
                         $or: [
                              { 'accountantName': { $regex: searchQuery, $options: 'i' } },
                              { 'parkingAssistantName': { $regex: searchQuery, $options: 'i' } }
                         ]
                    }
               }] : [])
          ];

          // Calculate totals for totalCollectedAmount and totalFine
          const totals = await SupervisorSettlementTicket.aggregate([
               ...pipeline,
               {
                    $group: {
                         _id: null,
                         totalCollection: { $sum: '$totalCollection' },
                         totalCollectedAmount: { $sum: '$totalCollectedAmount' },
                         totalFine: { $sum: '$totalFine' },
                         totalReward: { $sum: '$totalReward' },
                    }
               }
          ]);

          // Count total documents matching the query
          const totalCount = await SupervisorSettlementTicket.aggregate([
               ...pipeline,
               { $count: 'totalCount' }
          ]);

          const totalPages = Math.ceil((totalCount.length > 0 ? totalCount[0].totalCount : 0) / pageSize);

          // Find tickets based on the query, select specific fields, and apply pagination
          const result = await SupervisorSettlementTicket.aggregate([
               ...pipeline,
               { $sort: { createdAt: -1 } },
               { $skip: (page - 1) * pageSize },
               { $limit: parseInt(pageSize) }
          ]);

          if (result.length === 0) {
               return res.status(200).json({ message: responses.messages[language].noSettlementTicketsFound, result: [] });
          }

          // Pagination logic to determine next and previous pages
          const nextPage = page < totalPages ? { page: parseInt(page) + 1, pageSize: parseInt(pageSize) } : null;
          const prevPage = page > 1 ? { page: parseInt(page) - 1, pageSize: parseInt(pageSize) } : null;

          // Prepare response object with tickets, pagination details, and totals
          const response = {
               tickets: result,
               pagination: {
                    totalCount: totalCount.length > 0 ? totalCount[0].totalCount : 0,
                    totalPages,
                    nextPage,
                    prevPage,
               },
               stats: totals.length > 0 ? totals[0] : { totalCollection: 0, totalCollectedAmount: 0, totalFine: 0, totalReward: 0 },
          };

          return res.status(200).json({ message: responses.messages[language].settlementTicketsFetchedSuccessfully, result: response });

     } catch (error) {
          console.error("Error getting all tickets.", error);
          return res.status(500).json({ error: responses.errors[language].internalServerError });
     }
};


export const getAllSettlementTicketsOld = async (req, res) => {
     const { supervisorID } = req.params;
     const { page = 1, pageSize = 10 } = req.query; // Extract page and pageSize from query params
     console.log("pageSize  ", pageSize);
     try {
          console.log("supervisorID ", supervisorID);
          if (isEmpty(supervisorID)) {
               return res.status(404).json({ error: 'No supervisor id provided. Please check again.' });
          }
          else {
               const query = {
                    supervisor: new mongoose.Types.ObjectId(supervisorID)
               };

               // Count total documents matching the query
               const totalCount = await SupervisorSettlementTicket.countDocuments(query);
               const totalPages = Math.ceil(totalCount / pageSize);

               // Find tickets based on the query, select specific fields, and apply pagination
               const result = await SupervisorSettlementTicket.find(query)
                    .select('totalCollection totalCollectedAmount totalFine totalReward cashCollected createdAt')
                    .populate('supervisor', 'name code')
                    .populate('parkingAssistant', 'name supervisorCode')
                    .populate('accountantId', 'name')
                    .sort({ createdAt: -1 })
                    .skip((page - 1) * pageSize)
                    .limit(parseInt(pageSize))
                    .exec();

               console.log("Result ", result.length);
               if (isEmpty(result)) {
                    return res.status(200).json({ message: 'No settlement tickets found for this supervisor.', result: [] });
               } else {
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
                              totalCount,
                              totalPages,
                              nextPage,
                              prevPage,
                         },
                    };

                    return res.status(200).json({ message: 'Here is the settlement ticket list.', result: response });
               }
          }

     } catch (error) {
          console.error("Error getting all tickets.", error);
          return res.status(500).json({ error: error.message });
     }
};

export const getSupervisorStats = async (req, res) => {
     const supervisorId = req.params.supervisorID;
     const language = getLanguage(req, responses); // Fallback to English if language is not set

     try {

          const tickets = await SupervisorSettlementTicket.find({
               supervisor: new mongoose.Types.ObjectId(supervisorId),
               isSettled: false
          }, {
               cashComponent: 1,
          });

          // Initialize totals
          const denominationTotals = {
               '500': 0,
               '200': 0,
               '100': 0,
               '50': 0,
               '20': 0,
               '10': 0,
               '5': 0,
               '2': 0,
               '1': 0
          };
          // Iterate over tickets and calculate totals
          tickets.forEach(ticket => {
               ticket.cashComponent.forEach(component => {
                    const { denomination, count } = component;
                    if (denominationTotals.hasOwnProperty(denomination)) {
                         denominationTotals[denomination] += count;
                    }
               });
          });


          const statsPipeline = [
               {
                    $match: {
                         supervisor: new mongoose.Types.ObjectId(supervisorId),
                         isSettled: false
                    }
               },
               {
                    $group: {
                         _id: null,
                         totalCollection: { $sum: '$totalCollection' },
                         totalCollectedAmount: { $sum: '$totalCollectedAmount' },
                         totalFine: { $sum: '$totalFine' },
                         cashCollected: { $sum: '$cashCollected' },
                         totalReward: { $sum: '$totalReward' },
                         totalTicketsCount: { $sum: 1 }, // Counting the number of tickets
                         cashCollection: { $sum: 1 }, // Counting the number of tickets
                         onlineCollection: { $sum: 1 }, // Counting the number of tickets
                    }
               }
          ];

          const [stats, lastSettledTicket] = await Promise.all([
               SupervisorSettlementTicket.aggregate(statsPipeline),
               SupervisorSettlementTicket.findOne({ supervisor: supervisorId, isSettled: true })
                    .sort({ updatedAt: -1 })
                    .select('updatedAt')
                    .lean()
          ]);

          if (!stats || stats.length === 0) {
               return res.status(200).json({
                    message: responses.messages[language].noUnsettledTicketsFound,
                    result: {
                         TotalCollection: 0,
                         TotalCollectedAmount: 0,
                         TotalFine: 0,
                         TotalReward: 0,
                         TotalTicketsCount: 0,
                         cashCollected: 0,
                         CashCollection: 0,
                         OnlineCollection: 0,
                         CashComponents: [],
                         TodaysColection: 0,
                         LastSettledTicketUpdatedAt: null
                    }
               });
          }

          const supervisorStats = {
               TotalCollection: stats[0]?.totalCollection || 0,
               TotalCollectedAmount: stats[0]?.totalCollectedAmount || 0,
               TotalFine: stats[0]?.totalFine || 0,
               TotalReward: stats[0]?.totalReward || 0,
               cashCollected: stats[0]?.cashCollected || 0,
               CashCollection: stats[0]?.cashCollection || 0,
               OnlineCollection: stats[0]?.onlineCollection || 0,
               TotalTicketsCount: stats[0]?.totalTicketsCount || 0,
               CashComponents: denominationTotals || [], // Include the cash components
               LastSettledTicketUpdatedAt: lastSettledTicket ? lastSettledTicket.updatedAt : null
          };

          return res.status(200).json({
               message: responses.messages[language].supervisorStatsFetchedSuccessfully,
               result: { ...supervisorStats, TodaysColection: Math.round(+supervisorStats.CashCollection + +supervisorStats.OnlineCollection) }
          });
     } catch (error) {
          console.error("Error getting the supervisor stats.", error);
          return res.status(500).json({ error: responses.errors[language].internalServerError });
     }
};


export const getAllSuperVisors = async (req, res) => {
     const language = getLanguage(req, responses); // Fallback to English if language is not set

     try {
          const allSupervisors = await User.find({ role: 'supervisor' }, { _id: 1, code: 1, name: 1 })
               .sort({ createdAt: -1 });

          return res.status(200).json({
               message: responses.messages[language].allSupervisorsListFetchedSuccessfully,
               result: allSupervisors
          });
     } catch (error) {
          console.error("Error getting all supervisors.", error);
          return res.status(500).json({ error: responses.errors[language].internalServerError });
     }
};

// Get the stats of the tickets for the assistant
export const getLifeTimeStatsBySupervisorId = async (req, res) => {
     const language = getLanguage(req, responses);
     const supervisorId = req.params.supervisorID;

     try {
          const tickets = await SupervisorSettlementTicket.aggregate([
               { $match: { supervisor: new mongoose.Types.ObjectId(supervisorId) } },
               {
                    $group: {
                         _id: null,
                         totalCollection: { $sum: "$totalCollection" },
                         totalCollectedAmount: { $sum: "$totalCollectedAmount" },
                         totalFine: { $sum: "$totalFine" },
                         totalReward: { $sum: "$totalReward" },
                         totalCashCollected: { $sum: { $size: "$cashCollected" } }, // Example to count entries
                         totalTicketCount: { $sum: 1 }
                    }
               }
          ])

          console.log({ tickets });


          return res.json(
               isEmpty(tickets) ?
                    {
                         message: responses.messages[language].noUnsettledTicketsFound,
                         result: {
                              "totalCollection": 0,
                              "totalCollectedAmount": 0,
                              "totalFine": 0,
                              "totalReward": 0,
                              "totalCashCollected": 0,
                              "totalTicketCount": 0
                         }
                    }
                    :
                    {
                         // message: responses.messages[language].settlementsFetched,
                         message: responses.messages[language].supervisorStatsFetchedSuccessfully,
                         result: tickets
                    }
          );
     } catch (error) {
          return res
               .status(500)
               .json({ message: responses.errors[language].serverError });
     }
};


export const getAssistantDetailsBySupervisorId = async (req, res) => {
     try {
          const { supervisorID } = req.params; // Get userId from request params

          // Step 1: Find the supervisorCode of the given user
          const user = await User.findById(supervisorID).select('code'); // Adjust field name if necessary

          if (!user) {
               return res.status(404).json({ message: 'Supervisor not found' });
          }

          const { code } = user;
          console.log({ code });

          // Step 2: Aggregate users based on supervisorCode
          const stats = await User.aggregate([
               {
                    $match: {
                         role: 'assistant',
                         supervisorCode: code // Filter by supervisorCode obtained from the user
                    }
               },
               {
                    $group: {
                         _id: null,
                         totalCount: { $sum: 1 }, // Total count of users
                         onlineCount: {
                              $sum: {
                                   $cond: [{ $eq: ['$isOnline', true] }, 1, 0] // Count users with isOnline = true
                              }
                         },
                         offlineCount: {
                              $sum: {
                                   $cond: [{ $eq: ['$isOnline', false] }, 1, 0] // Count users with isOnline = false
                              }
                         }
                    }
               },
               {
                    $project: {
                         _id: 0, // Exclude the _id field
                         totalCount: 1,
                         onlineCount: 1,
                         offlineCount: 1
                    }
               }
          ]);

          // Handle the result
          const result = stats.length > 0 ? stats[0] : { totalCount: 0, onlineCount: 0, offlineCount: 0 };

          return res.status(200).json({
               message: 'User stats fetched successfully',
               result
          });
     } catch (error) {
          return res.status(500).json({ message: 'Server error', error: error.message });
     }
};
