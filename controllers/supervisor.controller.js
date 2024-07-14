import User from '../models/user.model.js'; // Import the ParkingAssistant model
import ParkingTicket from '../models/parkingTicket.model.js';
import SupervisorSettlement from "../models/settlementTicket.model.js"
import mongoose from 'mongoose';
import { isEmpty } from '../utils/helperFunctions.js';


export const settleParkingTickets = async (req, res) => {
     const { supervisorID, CashComponent, totalCollection, totalCollectedAmount, TotalFine, TotalRewards } = req.body;
     const { parkingAssistantID } = req.params;
     console.log("parkingAssistantID ", parkingAssistantID);
     try {
          // Fetch non-settled parking tickets with paymentMode as Cash and matching parkingAssistantID
          if (isEmpty(CashComponent)) {
               return res.status(404).json({
                    error: 'Cash components are required.'
               });
          }
          console.log("Total ", Object.keys(CashComponent).reduce((total, key) => key !== "Total" ? total + parseInt(key) * CashComponent[key] : total, 0));

          if (CashComponent["Total"] != Object.keys(CashComponent).reduce((total, key) => key !== "Total" ? total + parseInt(key) * CashComponent[key] : total, 0)) {
               return res.status(404).json({
                    error: 'Please check cash amount and total field.'
               });
          }

          // Check if the reward Is valid amount.
          if ((totalCollection - TotalFine) < 2000 && TotalRewards > 0) {
               return res.status(404).json({ error: 'Not eligible for the rewards.' });
          }
          if ((totalCollection - TotalFine) >= 2000 && TotalRewards != 200) {
               return res.status(404).json({ error: 'Please check reward amount.' });
          }

          const findAssistant = await User.findById(parkingAssistantID);

          if (isEmpty(findAssistant)) {
               return res.status(404).json({ error: 'Assistant not find please check the id.' });
          }

          const pipeline = [
               // Match documents where phoneNumber matches and status is not settled
               { $match: { parkingAssistant: new mongoose.Types.ObjectId(parkingAssistantID), status: { $ne: 'settled' } } },

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

          let ticketsToUpdate = await ParkingTicket.aggregate(pipeline);
          ticketsToUpdate = ticketsToUpdate ? ticketsToUpdate[0] : [];
          console.log("ticketsToUpdate ", ticketsToUpdate);

          if (isEmpty(ticketsToUpdate)) {
               const lastUpdated = await ParkingTicket.findOne({ parkingAssistant: new mongoose.Types.ObjectId(parkingAssistantID), status: 'settled' }, { updatedAt: 1 }).sort({ updatedAt: -1 })

               return res.status(404).json({ error: 'No non-settled tickets found for the provided assistant ID.', result: { lastSettled: (new Date(lastUpdated.updatedAt)) } });
          }

          // Create a new settlement ticket
          const settlementTicket = new SupervisorSettlement({
               supervisor: new mongoose.Types.ObjectId(supervisorID),
               parkingAssistant: new mongoose.Types.ObjectId(parkingAssistantID),
               totalCollection,
               totalCollectedAmount,
               totalFine: TotalFine,
               totalReward: TotalRewards,
               cashCollected: [], // Assuming you'll handle this based on your business logic
               accountantId: parkingAssistantID, // Placeholder, adjust as needed
               isSettled: false // Will be set to true after updating tickets
          });

          // Save the new settlement ticket
          const savedSettlement = await settlementTicket.save();

          // Execute all update tickets
          // const UpdatedTicketStatus = await ParkingTicket.aggregate(updateStatusPipeline).exec();
          // console.log("UpdatedTicketStatus ", UpdatedTicketStatus);

          await ParkingTicket.updateMany(
               {
                    parkingAssistant: new mongoose.Types.ObjectId(parkingAssistantID),
                    status: { $ne: 'settled' }
               },
               {
                    $set: {
                         status: 'settled',
                         supervisor: supervisorID, // Add supervisorId (assuming supervisorId is a variable)
                         settlementId: savedSettlement._id // Add settlementId (assuming settlementId is a variable)
                    }
               });


          await User.findByIdAndUpdate(parkingAssistantID, {
               lastSettledTicketId: savedSettlement._id
          });

          await SupervisorSettlement.updateOne(
               {
                    _id: new mongoose.Types.ObjectId(savedSettlement._id),
                    settled: { $ne: 'true' }
               },
               {
                    $set: {
                         settled: 'true'
                    }
               });

          return res.json({ message: 'Tickets settled successfully.', result: { settlementId: savedSettlement._id } });
     } catch (error) {
          return res.status(500).json({ error: error.message });
     }
}

export const getParkingAssistants = async (req, res) => {
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

          if (queryParam) {
               query = {
                    ...query,
                    $or: isEmpty(queryParam) ?
                         []
                         :
                         [
                              { 'isOnline': queryParam === 'isOnline' }, // Convert string 'true' to boolean true
                              { 'phone': queryParam },
                              { 'name': queryParam }
                         ],
                    $or: isEmpty(shiftID) ?
                         []
                         :
                         [{ 'shiftId': queryParam }]
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


export const getAllSettlementTickets = async (req, res) => {
     const { supervisorID } = req.params;
     try {
          console.log("supervisorID ", supervisorID);
          if (isEmpty(supervisorID)) {
               return res.status(404).json({ error: 'Not supervisor id provided please check again.' });
          }
          else {

               const pipeline = [
                    // Stage 1: Match document by _id
                    { $match: { supervisor: new mongoose.Types.ObjectId(supervisorID), isSettled: { $ne: 'true' } } },

                    // Stage 2: Project to get the code field
                    { $project: { totalCollection: 1, totalCollectedAmount: 1, isSettled: 1, totalFine: 1, totalReward: 1 } }
               ];

               // Execute the aggregation pipeline
               const result = await SupervisorSettlement.aggregate(pipeline).exec();

               console.log("Result ", result);
               if (isEmpty(result)) {
                    return res.status(404).json({ error: 'No tickets found.' });
               }
               else {

                    return res.status(200).json({ error: 'Here is the settlement ticket list.', result: result });
               }
          }

     } catch (error) {
          console.error("Error gettig all ticket.");
          return res.stats(500).json({ error: "Error on the server geting tickets" })
     }
}

export const getSupervisorStats = async (req, res) => {
     const supervisorId = req.params.supervisorID; // Assuming supervisorId is passed in request params
     console.log("supervisorId ", supervisorId);
     try {
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
                         totalReward: { $sum: '$totalReward' },
                         totalTicketsCount: { $sum: 1 } // Counting the number of tickets
                    }
               }
          ];

          const [stats, lastSettledTicket] = await Promise.all([
               SupervisorSettlement.aggregate(statsPipeline),
               SupervisorSettlement.findOne({ supervisor: supervisorId, isSettled: true })
                    .sort({ updatedAt: -1 })
                    .select('updatedAt')
                    .lean()
          ]);

          console.log("stats  ", stats);

          if (!stats || stats.length === 0) {
               return res.status(200).json({
                    message: 'No unseteled tickets found for the supervisor.',
                    result: {
                         TotalCollection: 0,
                         TotalCollectedAmount: 0,
                         TotalFine: 0,
                         TotalReward: 0,
                         TotalTicketsCount: 0,
                         LastSettledTicketUpdatedAt: null
                    }
               });
          }

          const supervisorStats = {
               TotalCollection: stats[0]?.totalCollection || 0,
               TotalCollectedAmount: stats[0]?.totalCollectedAmount || 0,
               TotalFine: stats[0]?.totalFine || 0,
               TotalReward: stats[0]?.totalReward || 0,
               TotalTicketsCount: stats[0]?.totalTicketsCount || 0,
               LastSettledTicketUpdatedAt: lastSettledTicket ? lastSettledTicket?.updatedAt : null
          };

          return res.status(200).json({ message: "Here is supervisor stats.", result: supervisorStats });
     } catch (error) {
          console.error("Error getting the supervisor stats.", error);
          return res.status(500).json({ error: error.message });
     }

}

export const getAllSuperVisors = async (req, resp) => {
     try {
          const allSupervisors = await User.find({ role: "supervisor" }, { _id: 1, code: 1, name: 1 })
          return resp.status(200).json({ message: "All supervisors list.", result: allSupervisors });
     } catch (error) {
          console.error("Error getting the supervisor stats.", error);
          return resp.status(500).json({ error: error.message });
     }
}
