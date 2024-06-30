import ParkingTicket from '../models/parkingTicket.model.js'; // Adjust the path based on your project structure
import { isEmpty } from '../utils/helperFunctions.js';
import generatePayment from '../utils/generatePayment.js';
import Transaction from '../models/onlineTransaction.model.js';

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
               parkingAssistant: req.headers.userId,
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
          res.status(200).json({ message: "Parking ticket created", result: savedTicket });
     } catch (error) {
          if (error.name === 'ValidationError') {
               // Mongoose validation error
               const errors = Object.values(error.errors).map(err => err.message);
               return res.status(400).json({ message: 'Validation Error', errors });
          }
          res.status(500).json({ message: error.message });
     }
};

// Confirm payment details if the payment is cussessful.
export const updatePaymentStatusOnline = async (req, res) => {
     try {
          console.log("Update order status", req.body);
          const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
          console.log("razorpay_order_id", razorpay_order_id);

          const generated_signature = hmac_sha256(razorpay_order_id + "|" + razorpay_payment_id, process.env.RAZORPAY_KEY_SECRET);

          console.log("generated_signature ", generated_signature);

          if (generated_signature == razorpay_signature) {
               console.log("payment is successful");

               const updatingThePAymentDetails = await Transaction.findOneAndUpdate({ order_id: razorpay_order_id }, {
                    razorpay_order_id, razorpay_payment_id, razorpay_signature
               })
               console.log("updatingThePAymentDetails ", updatingThePAymentDetails);

               return res.status(200).json({ message: "Payment completed successfully" })
          }
          else {
               return res.status(404).json({ message: "Signature does not match." })
          }
     }
     catch (error) {
          res.status(500).json({ message: error.message });
     }
};

// Generate order to accept the paymetns 
export const generatePaymentForTicket = async (req, res) => {
     try {
          const { amount } = req.body;
          const orderPaymentDetails = await generatePayment(amount);
          if (orderPaymentDetails.success) {
               const { reference_id, result: { amount, id } } = orderPaymentDetails;
               console.log(" amount, id ", amount, id);
               return res.status(200).json({ message: "Order generated for the ticket.", result: { id, amount, reference_id } });
          }
          else {
               console.error("Error message creating payment.", orderPaymentDetails);
               return res.status(500).json({ message: "Payment not generated please try again." });
          }
     } catch (error) {
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
               message: "here is the all parking tickets for you.",
               result: {
                    totalCount,
                    totalCost,
                    tickets
               }
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
          res.json({
               message: "Here is the ticket stats",
               result: results.length > 0 ? results[0] : { TotalAmount: 0, TotalCash: 0, TotalOnline: 0 }
          });
     } catch (error) {
          res.status(500).json({ message: error.message });
     }
};

// Controller to get a single parking ticket by PhoneNumer or VehicalNumber
export const getParkingTicketByQuery = async (req, res) => {
     const param = req.params.query;

     console.log("Params ", param);
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

          res.json({ message: "Here is all the matched results", result: ticket });
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
          res.json({ message: "Tickets updated.", result: updatedTicket });
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
