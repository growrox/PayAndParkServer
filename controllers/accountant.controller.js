import User from '../models/user.model.js'; // Import the ParkingAssistant model
import mongoose from 'mongoose';
import { isEmpty } from '../utils/helperFunctions.js';
import SupervisorSettlementTicket from '../models/settlementTicket.model.js';
import AccountantSettlementTicket from '../models/accountantSettlementTicket.model.js';


export const settleSupervisorTickets = async (req, res) => {
     const { accountantID, totalCollectedAmount, expense } = req.body;
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
          console.log("Check amount difference ", totalCollectedAmount);
          console.log("Check amount difference ", (TotalCollectedAmount - (TotalFine + TotalReward)));
          console.log("Check amount difference ", expense);
          console.log(Math.abs(totalCollectedAmount - (TotalCollectedAmount - (TotalFine + TotalReward))) != expense);

          if (Math.abs(totalCollectedAmount - (TotalCollectedAmount - (TotalFine + TotalReward))) != expense) {
               return res.status(404).json({
                    error: "Please re-check the collected amount or change the expense.",
                    amount: TotalCollectedAmount - (TotalFine + TotalReward)
               });
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

          return res.json({ message: 'Supervisor tickets settled successfully.', result: { settlementId: savedSettlement._id } });
     } catch (error) {
          console.error("Error settling the supervisor tickets.", error);
          return res.status(500).json({ error: error.message });
     }
}

export const getSupervisors = async (req, res) => {
     try {
          // Step 1: Get list of supervisors
          const supervisorsList = await User.find({ role: "supervisor" }, { name: 1, phone: 1 });

          if (supervisorsList.length === 0) {
               return res.status(404).json({ error: 'No Supervisor found.' });
          }

          // Step 2: Iterate through supervisors and fetch aggregated data from SupervisorSettlementTicket
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

               return {
                    supervisor: {
                         _id: supervisor._id,
                         name: supervisor.name,
                         phone: supervisor.phone,
                         totalFine: supervisorStats.length > 0 ? supervisorStats[0].totalFine : 0,
                         cashCollected: supervisorStats.length > 0 ? supervisorStats[0].cashCollected : 0,
                         totalReward: supervisorStats.length > 0 ? supervisorStats[0].totalReward : 0,
                         totalCollectedAmount: supervisorStats.length > 0 ? supervisorStats[0].totalCollectedAmount : 0,
                    }
               };
          }));

          return res.status(200).json({ message: 'Here is the supervisor list with stats.', result: supervisorsWithStats });

     } catch (error) {
          console.error("Error getting the supervisors with stats.", error);
          return res.status(500).json({ error: error.message });
     }
};

export const getAllSettlementTickets = async (req, res) => {
     const { accountantID } = req.params;
     try {
          console.log("supervisorID ", accountantID);
          if (isEmpty(accountantID)) {
               return res.status(404).json({ error: 'Not supervisor id provided please check again.' });
          }
          else {

               const pipeline = [
                    // Stage 1: Match document by _id
                    { $match: { accountant: new mongoose.Types.ObjectId(accountantID) } },

                    // Stage 2: Project to get the code field
                    { $project: { totalCollection: 1, totalCollectedAmount: 1, totalFine: 1, totalReward: 1 } }
               ];

               // Execute the aggregation pipeline
               const result = await AccountantSettlementTicket.find({ accountant: new mongoose.Types.ObjectId(accountantID) }).populate('supervisor', 'name code').populate('accountant', 'name');

               console.log("Result ", result);
               if (isEmpty(result)) {
                    return res.status(200).json({ message: 'Here is the settlement ticket list.', result: [] });
               }
               else {
                    return res.status(200).json({ message: 'Here is the settlement ticket list.', result: result });
               }
          }

     } catch (error) {
          console.error("Error gettig all ticket.");
          return res.status(500).json({ error: error.message });

     }
}

export const getAllSettlementTicketsBySupervisor = async (req, res) => {
     const { supervisorID } = req.params;
     try {
          console.log("supervisorID ", supervisorID);
          if (isEmpty(supervisorID)) {
               return res.status(404).json({ error: 'No supervisor id provided please check again.' });
          }
          const findSupervisor = await User.findOne({
               _id: new mongoose.Types.ObjectId(supervisorID), role: "supervisor"
          });

          if (isEmpty(findSupervisor)) {
               return res.status(404).json({ error: 'Supervisor not found.' });
          }

          const pipeline = [
               // Stage 1: Match document by _id
               { $match: { supervisor: new mongoose.Types.ObjectId(supervisorID), isSettled: { $ne: 'true' } } },

               // Stage 2: Project to get the code field
               { $project: { totalCollection: 1, totalCollectedAmount: 1, isSettled: 1, totalFine: 1, totalReward: 1 } }
          ];

          // Execute the aggregation pipeline
          const result = await SupervisorSettlementTicket.aggregate(pipeline).exec();

          console.log("Result ", result);


          return res.status(200).json({ message: 'Here is the list of tickets of supervisor.', result: isEmpty(result) ? [] : result });


     } catch (error) {
          console.error("Error gettig all ticket.");
          return res.status(500).json({ error: error.message });

     }
}

export const getAccountantStats = async (req, res) => {
     const supervisorId = req.params.supervisorID; // Assuming supervisorId is passed in request params
     console.log("supervisorId ", supervisorId);
     try {
          // Get the start and end of today
          const today = new Date();
          today.setUTCHours(0, 0, 0, 0); // Start of today
          const tomorrow = new Date(today);
          tomorrow.setUTCDate(today.getUTCDate() + 1); // Start of tomorrow

          const statsPipeline = [
               {
                    $match: {
                         supervisor: new mongoose.Types.ObjectId(supervisorId),
                         isSettled: false,
                         createdAt: {
                              $gte: today,
                              $lt: tomorrow
                         }
                    }
               },
               {
                    $group: {
                         _id: null,
                         totalCollection: { $sum: '$totalCollection' },
                         totalCollectedAmount: { $sum: '$totalCollectedAmount' },
                         totalFine: { $sum: '$totalFine' },
                         totalReward: { $sum: '$totalReward' },
                         totalTicketsCount: { $sum: 1 } // Counting the number of tickets
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

          console.log("stats  ", stats);

          const supervisorStats = {
               TotalCollection: stats[0]?.totalCollection || 0,
               TotalCollectedAmount: stats[0]?.totalCollectedAmount || 0,
               TotalFine: stats[0]?.totalFine || 0,
               TotalReward: stats[0]?.totalReward || 0,
               TotalTicketsCount: stats[0]?.totalTicketsCount || 0,
               LastSettledTicketUpdatedAt: lastSettledTicket ? lastSettledTicket.updatedAt : null
          };

          return res.status(200).json({
               message: "Here is the accountant stats.",
               result: supervisorStats
          });
     } catch (error) {
          console.error("Error getting the supervisor stats.", error);
          return res.status(500).json({ error: error.message });
     }
}

