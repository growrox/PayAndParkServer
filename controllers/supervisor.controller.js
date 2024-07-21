import User from '../models/user.model.js'; // Import the ParkingAssistant model
import ParkingTicket from '../models/parkingTicket.model.js';
import SupervisorSettlement from "../models/settlementTicket.model.js"
import mongoose from 'mongoose';
import { isEmpty } from '../utils/helperFunctions.js';


export const settleParkingTickets = async (req, res) => {
     const { supervisorID, cashComponent, cashCollected, totalCollection, totalCollectedAmount, TotalFine, TotalRewards } = req.body;
     const { parkingAssistantID } = req.params;
     console.log("parkingAssistantID ", parkingAssistantID);
     try {
          
          if (isEmpty(cashComponent)) {
               return res.status(400).json({
                    error: 'Cash components are required.'
               });
          }
          
          // Check if a settlement ticket was created today for this assistant
          const today = new Date();
          today.setHours(0, 0, 0, 0); // Set hours to start of day for comparison

          const existingTicketToday = await SupervisorSettlement.findOne({
               parkingAssistant: parkingAssistantID,
               createdAt: { $gte: today }
          });

          if (existingTicketToday) {
               return res.status(200).json({
                    message: 'Tickets already settled for today.',
                    result: { settlementId: existingTicketToday._id }
               });
          }

          // Proceed with the existing logic to settle tickets if no ticket was settled today

          // Validate cash amount and total
          const calculatedTotalCash = cashComponent.reduce((total, key) => total + +key.denomination * +key.count, 0)
          // Object.keys(CashComponent).reduce((total, key) => key !== "Total" ? total + parseInt(key) * CashComponent[key] : total, 0);
          if (cashCollected !== calculatedTotalCash) {
               return res.status(400).json({
                    error: "Please check cash amount and it's total.",
                    result: {
                         expectedAmount: cashComponent["Total"],
                         recivedAmount: calculatedTotalCash
                    }
               });
          }

          // Check eligibility for rewards based on total collection and fines
          if ((totalCollection - TotalFine) < 2000 && TotalRewards > 0) {
               return res.status(400).json({ error: 'Not eligible for rewards.' });
          }
          if ((totalCollection - TotalFine) >= 2000 && TotalRewards !== 200) {
               return res.status(400).json({ error: 'Please check reward amount.' });
          }

          // Find the parking assistant
          const findAssistant = await User.findById(parkingAssistantID);
          if (isEmpty(findAssistant)) {
               return res.status(404).json({ error: 'Assistant not found. Please check the ID.' });
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
          } : ticketsToUpdate[0]

          console.log("tickets To Update ", ticketsToUpdate);
          
          console.log("totalCollectedAmount ", totalCollectedAmount, "ticketsToUpdate.TotalCash - (TotalFine + TotalRewards) ", ticketsToUpdate.TotalCash, (TotalFine + TotalRewards));

          if (cashCollected != ticketsToUpdate.TotalCash ) {
               return res.status(404).json({
                    error: 'Cash collected amount is not same as cash amount.',
                    result: {
                         recivedAmount: cashCollected,
                         expectedAmount: ticketsToUpdate.TotalCash
                    }
               });
          }
          
          if (totalCollectedAmount != (ticketsToUpdate.TotalCash - (TotalFine + TotalRewards))) {
               return res.status(404).json({
                    error: 'Collected amount is not same as cash amount after giving reward and fine.',
                    result: {
                         recivedAmount: totalCollectedAmount,
                         expectedAmount: ticketsToUpdate.TotalCash - (TotalFine + TotalRewards)
                    }
               });
          }

          if ((ticketsToUpdate.TotalCash - (TotalFine + TotalRewards)) > 0 && (ticketsToUpdate.TotalCash - (TotalFine + TotalRewards)) > calculatedTotalCash) {
               return res.status(404).json({
                    error: "Please check cash collection amount it's less then expected.",
                    result: {
                         recivedCashAmount: calculatedTotalCash,
                         expectedCashAmount: ticketsToUpdate.TotalCash - (TotalFine + TotalRewards)
                    }
               });
          }

          if ((ticketsToUpdate.TotalCash - (TotalFine + TotalRewards)) > 0 && (ticketsToUpdate.TotalCash - (TotalFine + TotalRewards)) < calculatedTotalCash) {
               return res.status(404).json({
                    error: "Please check cash collection amount it's greater then expected.",
                    result: {
                         recivedCashAmount: calculatedTotalCash,
                         expectedCashAmount: ticketsToUpdate.TotalCash - (TotalFine + TotalRewards)
                    }
               });
          }

          // Create a new settlement ticket
          const settlementTicket = new SupervisorSettlement({
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
          await SupervisorSettlement.updateOne(
               {
                    _id: new mongoose.Types.ObjectId(savedSettlement._id),
                    settled: { $ne: true }
               },
               {
                    $set: { settled: true }
               }
          );

          // Return success response
          return res.json({ message: 'Tickets settled successfully.', result: { settlementId: savedSettlement._id } });
     } catch (error) {
          console.error(error);
          return res.status(500).json({ error: 'Internal server error.' });
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
     const { queryParam, shiftID } = req.query;

     try {
          // Find the supervisor by ID
          const supervisor = await User.findById(supervisorID);
          if (!supervisor) {
               return res.status(404).json({ error: 'Supervisor not found' });
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

          // Query users based on constructed query
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
               });

          // If no assistants match the query, return an empty array
          if (assistants.length === 0) {
               return res.json({ message: 'No assistants found', result: [] });
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

          return res.json({ message: 'Here is all your parking assistant list', result: assistants });
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
                         cashCollected: { $sum: '$cashCollected' },
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
                         cashCollected: 0,
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
