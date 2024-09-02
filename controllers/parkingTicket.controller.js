import ParkingTicket from "../models/parkingTicket.model.js"; // Adjust the path based on your project structure
import {
  __dirname,
  createRefId,
  isEmpty,
  sendTicketConfirmation,
} from "../utils/helperFunctions.js";
import generatePayment from "../utils/generatePayment.js";
import Transaction from "../models/onlineTransaction.model.js";
import User from "../models/user.model.js";
import CryptoJS from "crypto-js";
import fs from "fs";
import path from "path";
// Controller to create a new parking ticket
import NodeGeocoder from "node-geocoder";
import { getLanguage } from "../utils/helperFunctions.js";
import { responses } from "../utils/Translate/parkingTicket.response.js";
import mongoose from "mongoose";
import moment from "moment-timezone";
import TicketSequence  from '../models/ticketSequence.Model.js'; // Adjust the path as necessary

export const createParkingTicket = async (req, res) => {
  try {
    const {
      vehicleType,
      duration,
      paymentMode,
      remark,
      name,
      vehicleNumber,
      phoneNumber,
      amount,
      supervisor,
      settlementId,
      isPass,
      passId,
      onlineTransactionId,
      image,
      address,
      createdAtClient
    } = req.body;

    const { userId = "66bbb962af5dbeb885d5318f" } = req.headers;
    console.log({ userId });
    
    const language = getLanguage(req, responses);

    // Check if there is an assistant with the provided phone number and role
    const AssistanceAvailable = await User.findOne({ _id: new mongoose.Types.ObjectId(userId), isOnline: true });
    console.log({ AssistanceAvailable });

    if (!AssistanceAvailable || isEmpty(AssistanceAvailable.siteId)) {
      return res.status(200).json({
        message: responses.messages[language].NotFoundOrOnline,
      });
    }

    // Check if there is already a ticket for the vehicle number created within the last 30 minutes
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
    const existingTicket = await ParkingTicket.findOne({
      vehicleNumber: vehicleNumber.toLocaleUpperCase(),
      createdAt: { $gte: thirtyMinutesAgo },
    });

    if (existingTicket) {
      return res.status(200).json({
        message: responses.messages[language].ticketAlreadyAvailable,
      });
    }

    // Generate a unique ticket reference ID
    const ticketRefId = await generateTicketRefId();

    // Calculate ticket expiry
    let ticketExpiry;
    if (isPass) {
      const now = moment.tz('Asia/Kolkata'); // Current time in Asia/Kolkata timezone
      ticketExpiry = now.clone().add(30, 'days').endOf('day').toDate();
    } else {
      ticketExpiry = moment.tz('Asia/Kolkata').add(duration, 'hours').toDate();
    }

    // Create a new parking ticket
    const newTicket = new ParkingTicket({
      ticketRefId,
      parkingAssistant: userId,
      vehicleType,
      duration,
      paymentMode,
      remark,
      image,
      vehicleNumber: vehicleNumber.toLocaleUpperCase(),
      phoneNumber,
      amount,
      supervisor,
      settlementId,
      isPass,
      passId,
      name,
      address,
      createdAtClient,
      status: paymentMode === "Online" ? "paid" : "created",
      ticketExpiry,
      siteDetails: AssistanceAvailable.siteId
    });

    if (onlineTransactionId) {
      newTicket.onlineTransactionId = onlineTransactionId;
    } else if (paymentMode === "Online") {
      return res.status(200).json({ message: responses.messages[language].onlineTransaction });
    }

    const savedTicket = await newTicket.save();
    const ticketId = savedTicket._id;

    // Send SMS notification (optional)
    const smsParams = {
      Name: name,
      DateTime: createdAtClient,
      toNumber: phoneNumber,
      TicketNumber: ticketRefId,
      VehicalNumber: vehicleNumber.toLocaleUpperCase(),
      ParkingAssistant: AssistanceAvailable.name,
      Duration: duration,
      Amount: amount,
      PaymentMode: paymentMode,
    };

    const sendTicketConfirmationMessage = await sendTicketConfirmation(smsParams);

    return res.status(200).json({ message: responses.messages[language].ticketCreated, result: savedTicket });
  } catch (error) {
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({ error: "Validation Error", errors });
    }
    return res.status(500).json({ error: error.message });
  }
};

// Function to generate ticket reference ID
const generateTicketRefId = async () => {
  const now = moment.tz("2024-08-02 14:30:00",'Asia/Kolkata'); // Current time in Asia/Kolkata timezone
  const dateString = now.format('YYYY-MM-DD'); // Format YYYY-MM-DD
  const year = now.format('YY'); // Last two digits of the year
  const month = now.format('MM'); // Month with leading zero
  const day = now.format('DD'); // Day with leading zero

  // Atomic increment operation
  const sequence = await TicketSequence.findOneAndUpdate(
    { date: dateString },
    { $inc: { sequence: 1 } },
    { new: true, upsert: true }
  );

  const sequenceNumber = sequence.sequence.toString().padStart(4, '0'); // Sequence number with leading zeros

  return `PnP${year}${month}-${day}${sequenceNumber}`;
};


export const createParkingTicketOld = async (req, res) => {
  try {
    const {
      vehicleType,
      duration,
      paymentMode,
      remark,
      name,
      vehicleNumber,
      phoneNumber,
      amount,
      supervisor,
      settlementId,
      isPass,
      passId,
      onlineTransactionId,
      image,
      address,
      createdAtClient
    } = req.body;

    // console.log("Body ", req.body);
    const { userId = "66bbb962af5dbeb885d5318f" } = req.headers;
    const language = getLanguage(req, responses);

    // Check if there is an assistant with the provided phone number and role

    const AssistanceAvailable = await User.findOne({ _id: new mongoose.Types.ObjectId(userId), isOnline: true });
    console.log("AssistanceAvailable ", AssistanceAvailable);

    if (isEmpty(AssistanceAvailable.siteId)) {
      return res.status(200).json({
        message: responses.messages[language].NotFoundOrOnline,
      });
    }

    if (isEmpty(AssistanceAvailable)) {
      return res.status(200).json({
        message: responses.messages[language].NotFoundOrOnline,
      });
    }
    // Check if there is already a ticket for the vehicle number created within the last 30 minutes
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
    const existingTicket = await ParkingTicket.findOne({
      vehicleNumber: vehicleNumber.toLocaleUpperCase(),
      createdAt: { $gte: thirtyMinutesAgo },
    });

    if (existingTicket) {
      return res.status(200).json({
        message: responses.messages[language].ticketAlreadyAvailable,
      });
    }

    // const nextMonth = new Date("2024/01/31")
    let ticketExpiry;

    if (isPass) {
      const now = new Date();
      ticketExpiry = new Date(now.setDate(now.getDate() + 30))
      ticketExpiry = new Date(ticketExpiry.setHours(23, 59, 59, 999));
    }
    else {
      const now = new Date();
      ticketExpiry = new Date(now.getTime() + +duration * 60 * 60 * 1000);
    }

    const uniqueTicketId = await createRefId(createdAtClient)
    // console.log({ uniqueTicketId });


    // Create a new parking ticket
    const newTicket = new ParkingTicket({
      ticketRefId: uniqueTicketId,
      parkingAssistant: userId,
      vehicleType,
      duration,
      paymentMode,
      remark,
      image,
      vehicleNumber: vehicleNumber.toLocaleUpperCase(),
      phoneNumber,
      amount,
      supervisor,
      settlementId,
      isPass,
      passId,
      name,
      address,
      createdAtClient,
      status: paymentMode == "Online" ? "paid" : "created",
      ticketExpiry, // Add the passExpireAt field if isPass is true
      siteDetails: AssistanceAvailable.siteId
    });
    console.log("newTicket ", newTicket);

    if (isEmpty(onlineTransactionId)) {
      if (paymentMode == "Online") {
        return res
          .status(200)
          .json({ message: responses.messages[language].onlineTransaction });
      }
    } else {
      newTicket.onlineTransactionId = onlineTransactionId;
    }

    const savedTicket = await newTicket.save();
    const ticketId = savedTicket._id //"666f0e35284b2b8f1707c77b"; // savedTicket._id;
    // sendTicketConfirmation  Date, Time, Name, TicketNumber, VehicalNumber, ParkingAssistant, Duration, Amount, PaymentMode

    const smsParams = {
      Name: name,
      DateTime: createdAtClient,
      toNumber: phoneNumber,
      TicketNumber: `PnP${ticketId.toString().slice(5, 9)}`,
      VehicalNumber: vehicleNumber.toLocaleUpperCase(),
      ParkingAssistant: AssistanceAvailable.name,
      Duration: duration,
      Amount: amount,
      PaymentMode: paymentMode,
    };

    console.log("sms Params ", smsParams);

    // const sendTicketConfirmationMessage = await sendTicketConfirmation(smsParams);

    return res
      .status(200)
      .json({ message: responses.messages[language].ticketCreated, result: savedTicket });
  } catch (error) {
    if (error.name === "ValidationError") {
      // Mongoose validation error
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({ error: "Validation Error", errors });
    }
    return res.status(500).json({ error: error.message });
  }
};

// controller to get ticket details
export const getVehicleTypeDetail = async (req, res) => {
  try {
    const language = getLanguage(req, responses);
    const parkingTicket = await ParkingTicket.findById(req.params.id);
    parkingTicket.image = `${req.protocol}://${req.get("host")}/api/v1${parkingTicket.image
      }`;
    if (!parkingTicket)
      return res.status(404).json({
        error: responses.errors[language].ticketNotFound
        // "Parking ticket not found"
      });
    return res.json({
      message: responses.messages[language].vehicalList,
      // "All vehicals details list.",
      result: parkingTicket,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Confirm payment details if the payment is cussessful.
export const updatePaymentStatusOnline = async (req, res) => {
  try {
    const language = getLanguage(req, responses);
    console.log("Update order status", req.body);
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;
    console.log("razorpay_order_id", razorpay_order_id);

    // Generate signature using Razorpay's key secret
    const hmac = CryptoJS.HmacSHA256(
      `${razorpay_order_id}|${razorpay_payment_id}`,
      process.env.RAZORPAY_KEY_SECRET
    );
    const generated_signature = hmac.toString(CryptoJS.enc.Hex);

    console.log("generated_signature", generated_signature);

    // Verify if generated_signature matches razorpay_signature
    if (generated_signature === razorpay_signature) {
      console.log("Payment is successful");

      const transactionAvailable = await Transaction.findOne({
        order_id: razorpay_order_id,
      });
      if (isEmpty(transactionAvailable)) {
        console.log("Payment Not found. ", transactionAvailable);
      }

      // Update payment details in your database (example with Transaction model)
      const updatingThePaymentDetails = await Transaction.findOneAndUpdate(
        { order_id: razorpay_order_id },
        { razorpay_order_id, razorpay_payment_id, razorpay_signature }
      );

      console.log("updatingThePaymentDetails", updatingThePaymentDetails);

      return res
        .status(200)
        .json({
          message: responses.messages[language].onlinePaymentCompleted,
          // "Payment completed successfully"
        });
    } else {
      return res.status(404).json({ error: responses.errors[language].wrongSignature });
    }
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: error.message });
  }
};

// Generate order to accept the paymetns
export const generatePaymentForTicket = async (req, res) => {
  try {
    const language = getLanguage(req, responses);

    const { amount } = req.body;
    const orderPaymentDetails = await generatePayment(amount);
    if (orderPaymentDetails.success) {
      const {
        reference_id,
        result: { amount, id },
      } = orderPaymentDetails;
      console.log(" amount, id ", amount, id);
      return res.status(200).json({
        message: responses.messages[language].orderGenerated,
        // "Order generated for the ticket.",
        result: { id, amount, reference_id },
      });
    } else {
      console.error("Error message creating payment.", orderPaymentDetails);
      return res
        .status(500)
        .json({
          error: responses.errors[language].paymentNotGenerated,
          // "Payment not generated please try again."
        });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Controller to get all parking tickets with pagination
export const getParkingTickets = async (req, res) => {
  try {
    const language = getLanguage(req, responses);

    const { page = 1, pageSize = 10 } = req.query;

    // Parse page and pageSize into integers
    const parsedPage = parseInt(page);
    const parsedPageSize = parseInt(pageSize);

    // Calculate skip value for pagination
    const skip = (parsedPage - 1) * parsedPageSize;

    // Fetch parking tickets based on pagination
    const tickets = await ParkingTicket.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parsedPageSize)
      .exec();

    // Count total documents
    const totalCount = await ParkingTicket.countDocuments();

    // Calculate total pages
    const totalPages = Math.ceil(totalCount / parsedPageSize);

    // Pagination logic to determine next and previous pages
    let nextPage = null;
    let prevPage = null;

    if (parsedPage < totalPages) {
      nextPage = {
        page: parsedPage + 1,
        pageSize: parsedPageSize,
      };
    }

    if (parsedPage > 1) {
      prevPage = {
        page: parsedPage - 1,
        pageSize: parsedPageSize,
      };
    }

    // Prepare response object with tickets, pagination details, and totalCount
    const response = {
      tickets,
      pagination: {
        totalCount,
        totalPages,
        nextPage,
        prevPage,
      },
    };

    // Return successful response with status 200
    return res
      .status(200)
      .json({
        message: responses.messages[language].ticketList,
        // "Here is the parking tickets list",
        result: response
      });
  } catch (error) {
    // Handle errors and return status 500 with error message
    return res.status(500).json({ error: error.message });
  }
};

// Controller to get all the non settle tickets
export const getTicketsByAssistantId = async (req, res) => {
  const phoneNumber = req.params.assistantId;
  const language = getLanguage(req, responses);

  try {
    // Query to find all tickets where parkingAssistant's phoneNumber matches
    const tickets = await ParkingTicket.find({
      phoneNumber: phoneNumber,
      paymentMode: { $ne: "Cash" }, // Payment mode is not 'Cash'
      status: { $ne: "settled" }, // Status is not 'settled'
    }).sort({ createdAt: -1 });

    // Calculate total count of tickets
    const totalCount = tickets.length;

    // Calculate total cost where paymentMode is not 'Cash' and status is not 'settled'
    let totalCost = 0;
    tickets.forEach((ticket) => {
      totalCost += ticket.amount;
    });

    return res.json({
      message: responses.messages[language].ticketList,
      // "here is the all parking tickets for you.",
      result: {
        totalCount,
        totalCost,
        tickets,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Controller to get all the non settle tickets
export const getTicketsStatsByAssistantId = async (req, res) => {
  const phoneNumber = req.params.assistantId;
  const language = getLanguage(req, responses);

  try {
    const pipeline = [
      // Match documents where phoneNumber matches and status is not settled
      { $match: { phoneNumber: phoneNumber, status: { $ne: "settled" } } },

      // Group by null to calculate totals
      {
        $group: {
          _id: null,
          TotalAmount: { $sum: "$amount" },
          TotalCash: {
            $sum: {
              $cond: [{ $eq: ["$paymentMode", "Cash"] }, "$amount", 0],
            },
          },
          TotalOnline: {
            $sum: {
              $cond: [{ $eq: ["$paymentMode", "Online"] }, "$amount", 0],
            },
          },
        },
      },

      // Optionally project to reshape the output (if needed)
      { $project: { _id: 0 } },
    ];

    // Execute the aggregation pipeline
    const results = await ParkingTicket.aggregate(pipeline);

    // Return the results
    res.json({
      message: responses.messages[language].ticketList,
      // "Here is the ticket stats",
      result:
        results.length > 0
          ? results[0]
          : { TotalAmount: 0, TotalCash: 0, TotalOnline: 0 },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Controller to get a single parking ticket by PhoneNumer or VehicalNumber
export const getParkingTicketByQuery = async (req, res) => {
  const param = req.params.query;
  const language = getLanguage(req, responses);

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
    return res.status(400).json({ error: "Invalid query provided." });
  }

  try {
    const ticket = await ParkingTicket.findOne(query).sort({ createdAt: -1 });
    // .populate('parkingAssistant', 'name') // Populate parkingAssistant with 'name' field
    // .populate('supervisor', 'name'); // Populate supervisor with 'name' field

    if (isEmpty(ticket)) {
      return res.status(404).json({
        error: responses.errors[language].ticketNotFound,
        // "Parking ticket not found"
      });
    }

    return res.json({
      message: responses.messages[language].ticketList,
      // "Here is all the matched results",
      result: ticket,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Controller to update a parking ticket by ID
export const updateParkingTicketById = async (req, res) => {
  try {
    const language = getLanguage(req, responses);

    const updatedTicket = await ParkingTicket.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updatedTicket) {
      return res.status(404).json({
        error: responses.errors[language].ticketNotFound,
        // "Parking ticket not found"
      });
    }
    return res.json({
      message: responses.messages[language].ticketUpdated,
      // "Tickets updated.",
      result: updatedTicket
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      // Mongoose validation error
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({ error: "Validation Error", errors });
    }
    return res.status(500).json({ error: error.message });
  }
};

// Controller to delete a parking ticket by ID
export const deletePaymentOrderById = async (req, res) => {
  try {
    const language = getLanguage(req, responses);

    const deletedTicket = await Transaction.findByIdAndDelete(req.params.id);
    if (!deletedTicket) {
      return res
        .status(404)
        .json({
          error: responses.errors[language].ticketNotFound,
          // "Parking payment ticket not found"
        });
    }
    return res.json({
      message: responses.messages[language].deleteTicekt,

      // "Parking payment ticket deleted successfully"
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Controller to delete a parking ticket by ID
export const deleteParkingTicketById = async (req, res) => {
  try {
    const language = getLanguage(req, responses);

    const deletedTicket = await ParkingTicket.findByIdAndRemove(req.params.id);
    if (!deletedTicket) {
      return res.status(404).json({
        error: responses.errors[language].ticketNotFound,
        // "Parking ticket not found"
      });
    }
    return res.json({
      message: responses.messages[language].deleteTicket,
      // "Parking ticket deleted successfully"
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const uploadTicketImage = async (req, res) => {
  try {
    const file = req.file;
    const language = getLanguage(req, responses);

    console.log("userid,  file", file);

    if (!file) {
      return res.status(400).json({ error: "No file received" });
    }

    return res.status(200).json({
      filename: file.filename,
      path: `/images/tickets/${file.filename}`,
    });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: error });
  }
};

// Controller function to delete an image
export const deleteTicketImage = async (req, res) => {
  const filename = req.params.filename;
  const imagePath = path.join(__dirname, "..", "images", "tickets", filename);
  const language = getLanguage(req, responses);

  try {
    const myPromise = new Promise((resolve, reject) => {
      fs.unlink(imagePath, function (err) {
        if (err && err.code == "ENOENT") {
          console.info("File doesn't exist, won't remove it.");
          resolve(false);
        } else if (err) {
          resolve(false);
          console.error("Error occurred while trying to remove file");
        } else {
          console.info(`removed`);
          resolve(true);
        }
      });
    });

    if (await myPromise) {
      res.status(200).json({ message: "File deleted successfully." });
    } else {
      res.status(404).json({ error: "File not does not exist." });
    }
  } catch (error) {
    console.log("Error in the route ", error);
    res.status(500).json({ error: error });
  }
};

export const getAllTickets = async (req, res) => {
  try {
    const language = getLanguage(req, responses);

    const { search = "" } = req.query;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    let query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { vehicleNumber: { $regex: search, $options: "i" } },
      ];
    }
    const parkingTickets = await ParkingTicket.find(query)
      .populate("parkingAssistant supervisor")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();
    const count = await ParkingTicket.countDocuments(query);

    return res.status(200).json({
      result: {
        parkingTickets,
        totalPages: count,
        currentPage: page,
        totalCount: count,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err });
  }
};

export const getTicketLocation = async (req, res) => {
  try {
    const language = getLanguage(req, responses);

    const { lat, lon } = req.query;

    var options = {
      provider: "google",

      // Optionnal depending of the providers
      httpAdapter: "https", // Default
      apiKey: process.env.GEO_LOCATION_API, // for Mapquest, OpenCage, Google Premier
      formatter: null, // 'gpx', 'string', ...
    };

    const geocoder = NodeGeocoder(options);

    const result = await geocoder.reverse(
      { lat, lon },
      function (err, response) {
        return response;
      }
    );
    return res.status(200).json({
      result,
    });
  } catch (err) {
    res.status(500).json({ message: err });
  }
};

export const getTicketByVehicleNumber = async (req, res) => {
  try {
    // Extract vehicleNumber and vehicleType from query parameters
    const { vehicleNumber, vehicleType } = req.query;

    if (!vehicleNumber) {
      return res.status(400).json({ message: 'Vehicle number is required' });
    }

    // Create the query object based on the presence of vehicleType
    const query = { vehicleNumber: { $regex: vehicleNumber, $options: 'i' } };

    if (vehicleType) {
      query.vehicleType = vehicleType; // Exact match for vehicleType
    }

    // Query the database to find tickets with the given vehicle number and optional vehicle type
    // const tickets = await ParkingTicket.find(query, { name: 1, phoneNumber: 1, vehicleNumber: 1, vehicleType: 1 }); // Adjust the query based on your ORM/model
    const tickets = await ParkingTicket.aggregate([
      { $match: query }, // Match tickets based on the query
      { $addFields: { normalizedVehicleNumber: { $toLower: "$vehicleNumber" } } }, // Normalize vehicleNumber to lower case
      { $sort: { createdAt: 1 } }, // Sort by date (or any other field you want to use)
      {
        $group: {
          _id: "$normalizedVehicleNumber", // Group by normalizedVehicleNumber
          ticket: { $first: "$$ROOT" } // Get the first ticket for each normalizedVehicleNumber
        }
      },
      { $replaceRoot: { newRoot: "$ticket" } }, // Replace root with the ticket object
      { $project: { name: 1, phoneNumber: 1, vehicleNumber: 1, vehicleType: 1 } } // Project only required fields
    ]);

    console.log({ tickets });

    if (isEmpty(tickets)) {
      // If no ticket is found, return a message indicating it's a new vehicle
      return res.status(200).json({ message: 'This is a new vehicle' });
    } else {
      // If tickets are found, return their details
      return res.status(200).json({
        message: "Here is the matching tickets list.",
        result: tickets
      });
    }
  } catch (err) {
    // Handle any unexpected errors
    return res.status(500).json({ message: err.message });
  }
};

