import User from '../models/user.model.js'; // Import the ParkingAssistant model
import mongoose from 'mongoose';
import { isEmpty } from '../utils/helperFunctions.js';
import SupervisorSettlementTicket from '../models/settlementTicket.model.js';
import AccountantSettlementTicket from '../models/accountantSettlementTicket.model.js';
import moment from "moment-timezone";

export const settleSupervisorTickets = async (req, res) => {
     const { accountantID, totalCollectedAmount } = req.body;
     const { supervisorID } = req.params;
     console.log("accountantID ", accountantID);
     try {
          // Fetch non-settled parking tickets with paymentMode as Cash and matching parkingAssistantID

          const findSupervisor = await User.findById(supervisorID);
          if (isEmpty(findSupervisor)) {
               return res.status(404).json({ error: 'Supervisor not found please check the id.' });
          }


          const findAccountant = await User.findById(accountantID);
          if (isEmpty(findAccountant)) {
               return res.status(404).json({ error: 'Accountaint not found please check the id.' });
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
               return res.status(200).json({ message: 'No non-settled tickets found for the provided assistant ID.', lastSettled: (new Date(lastUpdated.updatedAt)) });
          }

          const { TotalCollectedAmount, TotalFine, TotalReward } = ticketsToSettle;


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

          return res.json({ message: 'Supervisor tickets settled successfully.', result: { settlementId: savedSettlement._id } });
     } catch (error) {
          console.error("Error settling the supervisor tickets.", error);
          return res.status(500).json({ error: error.message });
     }
}

export const getSupervisors = async (req, res) => {
     const { searchQuery, page = 1, pageSize = 10 } = req.query; // Extract search query, page, and pageSize from query params

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
               return res.status(404).json({ error: 'No Supervisor found.' });
          }

          // Step 3: Get list of supervisors matching the match condition with pagination
          const supervisorsList = await User.find(matchCondition, { name: 1, phone: 1, code: 1 })
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
               message: 'Here is the supervisor list with stats.',
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
     const { page = 1, pageSize = 10 } = req.query; // Extract page and pageSize from query params
     console.log("pageSize  ", pageSize);
     try {
          console.log("supervisorID ", accountantID);
          if (isEmpty(accountantID)) {
               return res.status(404).json({ error: 'No accountant id provided. Please check again.' });
          } else {
               const query = {
                    accountant: new mongoose.Types.ObjectId(accountantID)
               };

               // Count total documents matching the query
               const totalCount = await AccountantSettlementTicket.countDocuments(query);
               const totalPages = Math.ceil(totalCount / pageSize);

               // Find tickets based on the query, select specific fields, and apply pagination
               const result = await AccountantSettlementTicket.find(query)
                    .select('totalCollection totalCollectedAmount totalFine totalReward')
                    .populate('supervisor', 'name code')
                    .populate('accountant', 'name')
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

export const getAllSettlementTicketsBySupervisor = async (req, res) => {
     const { supervisorID } = req.params;
     const { page = 1, pageSize = 10 } = req.query; // Extract page and pageSize from query params

     try {
          console.log("supervisorID ", supervisorID);
          if (isEmpty(supervisorID)) {
               return res.status(404).json({ error: 'No supervisor id provided. Please check again.' });
          }

          // Check if supervisor exists
          const findSupervisor = await User.findOne({
               _id: new mongoose.Types.ObjectId(supervisorID),
               role: "supervisor"
          });

          if (isEmpty(findSupervisor)) {
               return res.status(404).json({ error: 'Supervisor not found.' });
          }

          const pipeline = [
               // Stage 1: Match documents by supervisorID and isSettled condition
               { $match: { supervisor: new mongoose.Types.ObjectId(supervisorID), isSettled: { $ne: true } } },

               // Stage 2: Project to get desired fields
               { $project: { totalCollection: 1, totalCollectedAmount: 1, isSettled: 1, totalFine: 1, totalReward: 1 } },

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
               message: 'Here is the list of tickets of supervisor.',
               result: {
                    tickets: isEmpty(result) ? [] : result,
                    pagination: {
                         totalCount,
                         totalPages,
                         currentPage: page,
                         pageSize: parseInt(pageSize)
                    }
               }
          });

     } catch (error) {
          console.error("Error getting all tickets.", error);
          return res.status(500).json({ error: error.message })
     }
};

export const getAccountantStats = async (req, res) => {
     const accountantID = req.params.accountantID;

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
               return res.status(404).json({ error: 'No AccountantSettlementTicket found for today.' });
          }
          console.log({todayAccountantSettlementTicket});
          // Extract all settlement IDs
          const settlementIds = todayAccountantSettlementTicket.map(ticket => ticket._id);
          console.log({settlementIds});
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
                         cashCollected: { $sum: '$cashCollected' }
                    }
               }
          ];

          const supervisorStats = await SupervisorSettlementTicket.aggregate(statsPipeline);
          console.log({supervisorStats});
          // Extracting values from the aggregation result
          const totalCollection = supervisorStats[0]?.totalCollection || 0;
          const totalCollectedAmount = supervisorStats[0]?.totalCollectedAmount || 0;
          const totalFine = supervisorStats[0]?.totalFine || 0;
          const totalReward = supervisorStats[0]?.totalReward || 0;
          const cashCollected = supervisorStats[0]?.cashCollected || 0;

          // Prepare response
          const response = {
               TotalCollection: totalCollection,
               TotalCollectedAmount: totalCollectedAmount,
               TotalFine: totalFine,
               TotalReward: totalReward,
               CashCollected: cashCollected,
               LastSettledTicketUpdatedAt: todayAccountantSettlementTicket[todayAccountantSettlementTicket.length - 1].updatedAt // Assuming updatedAt field provides the last settled time
          };

          return res.status(200).json({ message: 'Here is the accountant stats.', result: response });

     } catch (error) {
          console.error('Error getting the accountant stats.', error);
          return res.status(500).json({ error: 'Error getting accountant stats from the server.' });
     }
};
