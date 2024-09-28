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
import TicketSequence from "../models/ticketSequence.Model.js"; // Adjust the path as necessary
import DeletedParkingTicket from "../models/parkingTicketDeleted.model.js";
import VehicleType from "../models/vehicleType.model.js";

import xlsx from "xlsx";
import puppeteer from "puppeteer";
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
      onlineTransactionId,
      image,
      address,
      createdAtClient,
      vehicleID,
      priceID,
    } = req.body;

    const { userId } = req.headers;
    console.log({ userId });

    const language = getLanguage(req, responses);

    // Check if there is an assistant with the provided phone number and role
    const AssistanceAvailable = await User.findOne({
      _id: new mongoose.Types.ObjectId(userId),
      isOnline: true,
    });
    console.log({ AssistanceAvailable });

    if (isEmpty(AssistanceAvailable)) {
      return res.status(404).json({
        error: responses.errors[language].NotFoundOrOnline,
      });
    }

    if (isEmpty(AssistanceAvailable.siteId)) {
      return res.status(404).json({
        error: responses.errors[language].SiteNotFound,
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

    if (isEmpty(vehicleID) || isEmpty(priceID)) {
      return res.status(404).json({
        error: responses.messages[language].paymentDetailsRequired,
      });
    }

    const vehicalDetails = await VehicleType.aggregate([
      {
        $match: { _id: new mongoose.Types.ObjectId(vehicleID) }, // Match the vehicle type by its ID
      },
      {
        $unwind: "$hourlyPrices", // Unwind the hourlyPrices array to process each entry individually
      },
      {
        $match: { "hourlyPrices._id": new mongoose.Types.ObjectId(priceID) }, // Match the hourly price by its ID
      },
      {
        $project: {
          // Project only the hour and price fields
          _id: 0,
          hour: "$hourlyPrices.hour",
          price: "$hourlyPrices.price",
          gstPercentage: 1,
        },
      },
    ]);

    if (isEmpty(vehicalDetails)) {
      return res.status(404).json({
        error:
          responses.messages[language].paymentDetailsRequired + " NOT_FOUND",
      });
    }

    // Generate a unique ticket reference ID
    const ticketRefId = await generateTicketRefId();

    // Calculate ticket expiry
    let ticketExpiry;
    if (isPass) {
      const now = moment.tz("Asia/Kolkata"); // Current time in Asia/Kolkata timezone
      ticketExpiry = now.clone().add(30, "days").endOf("day").toDate();
    } else {
      ticketExpiry = moment
        .tz("Asia/Kolkata")
        .add(vehicalDetails[0].hour, "hours")
        .toDate();
    }

    const Amount = vehicalDetails[0].price;
    const ninePercent = +(Amount * 0.09).toFixed(2);
    const GrandTotal = Math.ceil(Amount + ninePercent * 2);

    // Create a new parking ticket
    const newTicket = new ParkingTicket({
      ticketRefId,
      parkingAssistant: userId,
      vehicleType,
      duration: vehicalDetails[0].hour,
      paymentMode,
      remark,
      image,
      vehicleNumber: vehicleNumber.toLocaleUpperCase(),
      phoneNumber,
      amount: GrandTotal,
      cgst: ninePercent,
      sgst: ninePercent,
      roundOff: (GrandTotal - (ninePercent * 2 + Amount)).toFixed(2),
      baseAmount: Amount,
      supervisor,
      settlementId,
      isPass,
      name,
      address,
      createdAtClient,
      status: paymentMode === "Online" ? "paid" : "created",
      ticketExpiry,
      siteDetails: AssistanceAvailable.siteId,
    });

    if (onlineTransactionId) {
      newTicket.onlineTransactionId = onlineTransactionId;
    } else if (paymentMode === "Online") {
      return res
        .status(200)
        .json({ message: responses.messages[language].onlineTransaction });
    }

    const savedTicket = await newTicket.save();

    // Send SMS notification (optional)
    const smsParams = {
      Name: name,
      DateTime: createdAtClient,
      toNumber: phoneNumber,
      TicketNumber: ticketRefId,
      VehicalNumber: vehicleNumber.toLocaleUpperCase(),
      ParkingAssistant: AssistanceAvailable.name,
      Duration: duration,
      Amount,
      PaymentMode: paymentMode,
    };

    const sendTicketConfirmationMessage = await sendTicketConfirmation(
      smsParams
    );

    return res.status(200).json({
      message: responses.messages[language].ticketCreated,
      result: savedTicket,
    });
  } catch (error) {
    console.error("eRROR CREATING THE TICKET ", error);

    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({ error: "Validation Error", errors });
    }
    return res.status(500).json({ error: error.message });
  }
};

// Function to generate ticket reference ID
const generateTicketRefId = async () => {
  const now = moment.tz("2024-08-02 14:30:00", "Asia/Kolkata"); // Current time in Asia/Kolkata timezone
  const dateString = now.format("YYYY-MM-DD"); // Format YYYY-MM-DD
  const year = now.format("YY"); // Last two digits of the year
  const month = now.format("MM"); // Month with leading zero
  const day = now.format("DD"); // Day with leading zero

  // Atomic increment operation
  const sequence = await TicketSequence.findOneAndUpdate(
    { date: dateString },
    { $inc: { sequence: 1 } },
    { new: true, upsert: true }
  );

  const sequenceNumber = sequence.sequence.toString().padStart(4, "0"); // Sequence number with leading zeros

  return `PnP${year}${month}-${day}${sequenceNumber}`;
};

// controller to get ticket details
export const getVehicleTypeDetail = async (req, res) => {
  try {
    const language = getLanguage(req, responses);
    const parkingTicket = await ParkingTicket.findById(req.params.id);
    parkingTicket.image = `${req.protocol}://${req.get("host")}/api/v1${
      parkingTicket.image
    }`;
    if (!parkingTicket)
      return res.status(404).json({
        error: responses.errors[language].ticketNotFound,
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

      return res.status(200).json({
        message: responses.messages[language].onlinePaymentCompleted,
        // "Payment completed successfully"
      });
    } else {
      return res
        .status(404)
        .json({ error: responses.errors[language].wrongSignature });
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
      return res.status(500).json({
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
    return res.status(200).json({
      message: responses.messages[language].ticketList,
      // "Here is the parking tickets list",
      result: response,
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

// Controller to delete a parking ticket by ID
export const deletePaymentOrderById = async (req, res) => {
  try {
    const language = getLanguage(req, responses);

    const deletedTicket = await Transaction.findByIdAndDelete(req.params.id);
    if (!deletedTicket) {
      return res.status(404).json({
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
    console.error("Error in the route ", error);
    res.status(500).json({ error: error });
  }
};

export const getAllTickets = async (req, res) => {
  try {
    const language = getLanguage(req, responses);

    const { search = "", exportFormat, isPass } = req.query;
    const { supervisors = [], assistants = [], startDate, endDate } = req.body;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    let match = {};

    if (search) {
      match.$or = [
        { name: { $regex: search, $options: "i" } },
        { vehicleNumber: { $regex: search, $options: "i" } },
        { vehicleType: { $regex: search, $options: "i" } },
        { phoneNumber: { $regex: search, $options: "i" } },
        { "siteDetails.name": { $regex: search, $options: "i" } },
        { "parkingAssistantDetails.name": { $regex: search, $options: "i" } },
        { "parkingAssistantDetails.phone": { $regex: search, $options: "i" } },
        {
          "parkingAssistantDetails.supervisorCode": {
            $regex: search,
            $options: "i",
          },
        },
        { "supervisorDetails.name": { $regex: search, $options: "i" } },
      ];
    }

    if (isPass === "pass") {
      match.isPass = true;
    } else if (isPass === "ticket") {
      match.isPass = false;
    }
    if (supervisors.length > 0) {
      match.supervisor = {
        $in: supervisors.map((id) => new mongoose.Types.ObjectId(id)),
      };
    }

    if (assistants.length > 0) {
      match.parkingAssistant = {
        $in: assistants.map((id) => new mongoose.Types.ObjectId(id)),
      };
    }

    if (startDate || endDate) {
      const dateRange = {};
      if (startDate) {
        const LocalStartDate = moment
          .tz(new Date(startDate), "Asia/Kolkata")
          .startOf("day")
          .clone()
          .utc();
        dateRange.$gte = new Date(LocalStartDate);
      }
      if (endDate) {
        const LocalEndDate = moment
          .tz(new Date(endDate), "Asia/Kolkata")
          .endOf("day")
          .clone()
          .utc();
        const end = new Date(LocalEndDate);
        dateRange.$lte = end;
      }
      match.createdAt = dateRange;
    }

    const aggregateQuery = [
      {
        $lookup: {
          from: "users",
          localField: "parkingAssistant",
          foreignField: "_id",
          as: "parkingAssistantDetails",
        },
      },
      // { $unwind: "$parkingAssistantDetails" },
      {
        $unwind: {
          path: "$parkingAssistantDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "supervisor",
          foreignField: "_id",
          as: "supervisorDetails",
        },
      },
      // { $unwind: "$supervisorDetails" },
      {
        $unwind: {
          path: "$supervisorDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "sites",
          localField: "siteDetails",
          foreignField: "_id",
          as: "siteDetails",
        },
      },
      {
        $unwind: {
          path: "$siteDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: match, // Combined match conditions
      },
      { $sort: { createdAt: -1 } },
    ];
    if (exportFormat !== "excel" && exportFormat !== "pdf") {
      aggregateQuery.push({ $skip: (page - 1) * limit }, { $limit: limit });
    }

    const parkingTickets = await ParkingTicket.aggregate(aggregateQuery);

    if (exportFormat === "excel") {
      return exportToExcel(parkingTickets, res);
    } else if (exportFormat === "pdf") {
      return exportToPDF(parkingTickets, res);
    }

    const countQuery = [
      {
        $lookup: {
          from: "users",
          localField: "parkingAssistant",
          foreignField: "_id",
          as: "parkingAssistantDetails",
        },
      },
      // { $unwind: "$parkingAssistantDetails" },
      {
        $unwind: {
          path: "$parkingAssistantDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "supervisor",
          foreignField: "_id",
          as: "supervisorDetails",
        },
      },
      // { $unwind: "$supervisorDetails" },
      {
        $unwind: {
          path: "$supervisorDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "sites",
          localField: "siteDetails",
          foreignField: "_id",
          as: "siteDetails",
        },
      },
      {
        $unwind: {
          path: "$siteDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: match, // Combined match conditions
      },
      { $count: "totalCount" },
    ];

    const countResult = await ParkingTicket.aggregate(countQuery);
    const count = countResult.length > 0 ? countResult[0].totalCount : 0;

    return res.status(200).json({
      result: {
        parkingTickets,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        totalCount: count,
      },
    });
  } catch (err) {
    console.log({ err });
    res.status(500).json({ message: err.message || err });
  }
};

// / Helper function to export to Excel
const exportToExcel = (tickets, res) => {
  const workbook = xlsx.utils.book_new();

  // Prepare the data for the worksheet
  const worksheetData = tickets.map((ticket) => ({
    Name: ticket.name,
    TicketId: ticket.ticketRefId,
    VehicleNumber: ticket.vehicleNumber,
    TicketOrPass: ticket.isPass ? "Pass" : "Ticket",
    VehicleType: ticket.vehicleType,
    PhoneNumber: ticket.phoneNumber,
    Amount: ticket.amount,
    BaseAmount: ticket.baseAmount || 0,
    CGST: ticket.cgst || 0,
    SGST: ticket.sgst || 0,
    PaymentMethod: ticket.paymentMode,
    Status: ticket.status,
    ParkingAssistant: ticket?.parkingAssistantDetails?.name,
    Supervisor: ticket?.supervisorDetails?.name,
    Site: ticket?.siteDetails ? ticket.siteDetails?.name : "",
    CreatedAt: ticket.createdAt,
    ExpiringAt: ticket.ticketExpiry,
  }));

  // Calculate the total amount
  const totalAmount = worksheetData.reduce((sum, row) => sum + row.Amount, 0);
  const totalBaseAmount = worksheetData.reduce(
    (sum, row) => sum + (row.BaseAmount ? Number(row.BaseAmount) : 0),
    0
  );

  const totalSgstAmount = worksheetData.reduce(
    (sum, row) => sum + (row.SGST ? Number(row.SGST) : 0),
    0
  );

  const totalCgstAmount = worksheetData.reduce(
    (sum, row) => sum + (row.CGST ? Number(row.CGST) : 0),
    0
  );

  // Add the total amount row at the end
  worksheetData.push({
    Name: "Total",
    VehicleNumber: "",
    TicketId: "",
    TicketOrPass: "",
    VehicleType: "",
    PhoneNumber: "",
    Amount: totalAmount, // The total amount
    BaseAmount: totalBaseAmount,
    CGST: totalCgstAmount,
    SGST: totalSgstAmount,
    PaymentMethod: "", // The total amount
    Status: "",
    ParkingAssistant: "",
    Supervisor: "",
    Site: "",
    CreatedAt: "",
  });

  // Create the worksheet
  const worksheet = xlsx.utils.json_to_sheet(worksheetData);

  // Get the total row index (last row)
  const totalRowIndex = worksheetData.length;

  xlsx.utils.book_append_sheet(workbook, worksheet, "Tickets");

  // Generate a dynamic filename
  const timestamp = moment().format("YYYYMMDD_HHmm");
  const filename = `KT_ENTERPRISE_Ticket_Details_${timestamp}.xlsx`;
  const filePath = path.join(__dirname, filename);

  // Write the workbook to a file and send it as a download
  xlsx.writeFile(workbook, filePath);
  res.download(filePath, filename, () => {
    fs.unlinkSync(filePath); // Delete the file after download
  });
};

// Helper function to export to PDF using Puppeteer
const exportToPDF = async (tickets, res) => {
  const totalAmount = tickets.reduce((sum, ticket) => sum + ticket.amount, 0);

  const htmlContent = generateHTMLContent(tickets, totalAmount);

  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    headless: true,
  });
  const page = await browser.newPage();
  await page.setContent(htmlContent);
  const pdfBuffer = await page.pdf({ format: "A4" });

  await browser.close();
  const timestamp = moment().format("YYYYMMDD_HHmm");
  const filename = `KT_ENTERPRISE_Ticket_Details_${timestamp}.pdf`;
  const filePath = path.join(__dirname, filename);
  fs.writeFileSync(filePath, pdfBuffer);
  res.download(filePath, filename, () => {
    fs.unlinkSync(filePath); // Delete the file after download
  });
};

// Function to generate HTML content for PDF
const generateHTMLContent = (tickets, totalAmount) => {
  let html = `
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; margin: 8px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        table, th, td { border: 1px solid black; }
        th, td { padding: 5px; text-align: left; font-size: 10px}
        th { background-color: #f2f2f2; }
        .bold { font-weight: bold; }
      </style>
    </head>
    <body>
      <h1>Parking Tickets Report</h1>
      <table>
        <thead>
          <tr>
            <th>Sr No.</th>
            <th>Name</th>
            <th>Ticket Id </th>
            <th>Vehicle Number</th>
            <th>Ticket / Pass</th>
            <th>Vehicle Type</th>
            <th>Phone Number</th>
            <th>Amount</th>
            <th>Base Amount</th>
            <th>CGST</th>
            <th>SGST</th>
            <th>Payment Method</th>
            <th>Status</th>
            <th>Parking Assistant</th>
            <th>Supervisor</th>
            <th>Site</th>
            <th>Created At</th>
            <th>Expiring At</th>
          </tr>
        </thead>
        <tbody>`;

  tickets.forEach((ticket, index) => {
    html += `
      <tr>
        <td>${index + 1}</td>
        <td>${ticket?.name}</td>
        <td>${ticket?.ticketRefId || ""}</td>
        <td>${ticket?.vehicleNumber}</td>
        <td>${ticket.isPass ? "Pass" : "Ticket"}</td>
        <td>${ticket.vehicleType}</td>
        <td>${ticket.phoneNumber}</td>
        <td>${ticket.amount}</td>
        <td>${ticket.baseAmount || 0}</td>
        <td>${ticket.cgst || 0}</td>
        <td>${ticket.sgst || 0}</td>
        <td>${ticket.paymentMode}</td>
        <td>${ticket.status}</td>
        <td>${ticket?.parkingAssistantDetails?.name}</td>
        <td>${
          ticket?.supervisorDetails ? ticket?.supervisorDetails?.name : ""
        }</td>
        <td>${ticket?.siteDetails ? ticket?.siteDetails?.name : ""}</td>
        <td>${moment(ticket.createdAt).format("MMMM Do YYYY, h:mm:ss a")}</td>
        <td>${moment(ticket.ticketExpiry).format(
          "MMMM Do YYYY, h:mm:ss a"
        )}</td>
      </tr>`;
  });

  // Add total amount row at the end of the table
  html += `
      <tr class="bold">
        <td colspan="4"><strong>Total</strong></td>
        <td><strong>${totalAmount}</strong></td>
        <td colspan="5"></td>
      </tr>`;

  html += `
        </tbody>
      </table>
    </body>
    </html>`;

  return html;
};

export const getTicketTotalsByPaymentMode = async (req, res) => {
  try {
    const { search = "" } = req.query;
    const { supervisors = [], assistants = [], startDate, endDate } = req.body;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    let match = {};

    if (search) {
      match.$or = [
        { name: { $regex: search, $options: "i" } },
        { vehicleNumber: { $regex: search, $options: "i" } },
        { vehicleType: { $regex: search, $options: "i" } },
        { phoneNumber: { $regex: search, $options: "i" } },
        { "siteDetails.name": { $regex: search, $options: "i" } },
        { "parkingAssistantDetails.name": { $regex: search, $options: "i" } },
        { "parkingAssistantDetails.phone": { $regex: search, $options: "i" } },
        {
          "parkingAssistantDetails.supervisorCode": {
            $regex: search,
            $options: "i",
          },
        },
        { "supervisorDetails.name": { $regex: search, $options: "i" } },
      ];
    }

    if (supervisors.length > 0) {
      match.supervisor = {
        $in: supervisors.map((id) => new mongoose.Types.ObjectId(id)),
      };
    }

    if (assistants.length > 0) {
      match.parkingAssistant = {
        $in: assistants.map((id) => new mongoose.Types.ObjectId(id)),
      };
    }

    if (startDate || endDate) {
      const dateRange = {};
      if (startDate) {
        const LocalStartDate = moment
          .tz(new Date(startDate), "Asia/Kolkata")
          .startOf("day")
          .clone()
          .utc();
        dateRange.$gte = new Date(LocalStartDate);
      }
      if (endDate) {
        const LocalEndDate = moment
          .tz(new Date(endDate), "Asia/Kolkata")
          .endOf("day")
          .clone()
          .utc();
        const end = new Date(LocalEndDate);
        dateRange.$lte = end;
      }
      match.createdAt = dateRange;
    }

    const aggregateQuery = [
      {
        $lookup: {
          from: "users",
          localField: "parkingAssistant",
          foreignField: "_id",
          as: "parkingAssistantDetails",
        },
      },
      {
        $unwind: {
          path: "$parkingAssistantDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "supervisor",
          foreignField: "_id",
          as: "supervisorDetails",
        },
      },
      {
        $unwind: {
          path: "$supervisorDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "sites",
          localField: "siteDetails",
          foreignField: "_id",
          as: "siteDetails",
        },
      },
      {
        $unwind: {
          path: "$siteDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: match, // Combined match conditions
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: {
            paymentMode: "$paymentMode",
            isPass: "$isPass", // Group by both paymentMode and isPass
          },
          totalAmount: { $sum: "$amount" }, // Sum the amount field
          count: { $sum: 1 }, // Keep the count if needed
        },
      },
    ];

    const totals = await ParkingTicket.aggregate(aggregateQuery);

    // Format the response to include totals for "Online", "Cash", "Free", and "Pass"
    const result = {
      online: 0,
      cash: 0,
      free: 0,
      pass: 0,
    };

    totals.forEach((total) => {
      if (total._id.isPass === true) {
        // If it's a pass, add to the pass total only
        result.pass += total.totalAmount;
      } else {
        // Only add to respective totals if it's not a pass
        if (total._id.paymentMode === "Online") {
          result.online += total.totalAmount;
        } else if (total._id.paymentMode === "Cash") {
          result.cash += total.totalAmount;
        } else if (total._id.paymentMode === "Free") {
          result.free += total.totalAmount;
        }
      }
    });

    return res.status(200).json({
      result,
    });
  } catch (err) {
    console.log({ err });
    res.status(500).json({ message: err.message || err });
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
      return res.status(400).json({ message: "Vehicle number is required" });
    }

    // Create the query object based on the presence of vehicleType
    const query = { vehicleNumber: { $regex: vehicleNumber, $options: "i" } };

    if (vehicleType) {
      query.vehicleType = vehicleType; // Exact match for vehicleType
    }

    // Query the database to find tickets with the given vehicle number and optional vehicle type
    // const tickets = await ParkingTicket.find(query, { name: 1, phoneNumber: 1, vehicleNumber: 1, vehicleType: 1 }); // Adjust the query based on your ORM/model
    const tickets = await ParkingTicket.aggregate([
      { $match: query }, // Match tickets based on the query
      {
        $addFields: { normalizedVehicleNumber: { $toLower: "$vehicleNumber" } },
      }, // Normalize vehicleNumber to lower case
      { $sort: { createdAt: 1 } }, // Sort by date (or any other field you want to use)
      {
        $group: {
          _id: "$normalizedVehicleNumber", // Group by normalizedVehicleNumber
          ticket: { $first: "$$ROOT" }, // Get the first ticket for each normalizedVehicleNumber
        },
      },
      { $replaceRoot: { newRoot: "$ticket" } }, // Replace root with the ticket object
      {
        $project: { name: 1, phoneNumber: 1, vehicleNumber: 1, vehicleType: 1 },
      }, // Project only required fields
    ]);

    console.log({ tickets });

    if (isEmpty(tickets)) {
      // If no ticket is found, return a message indicating it's a new vehicle
      return res.status(200).json({ message: "This is a new vehicle" });
    } else {
      // If tickets are found, return their details
      return res.status(200).json({
        message: "Here is the matching tickets list.",
        result: tickets,
      });
    }
  } catch (err) {
    // Handle any unexpected errors
    return res.status(500).json({ message: err.message });
  }
};

// Delete Ticket From the collection.
// Restore Ticket From the collection.

export const moveTicketToDeleted = async (req, res) => {
  const { ticketId } = req.params; // Assuming ticketId is passed as a URL parameter
  console.log("This route is different ", ticketId);

  try {
    // Find the ticket in the live collection
    const ticket = await ParkingTicket.findById(ticketId);

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    // Create a new DeletedParkingTicket document
    const deletedTicket = new DeletedParkingTicket(ticket.toObject());

    // Save the new DeletedParkingTicket document
    await deletedTicket.save();

    // Remove the ticket from the live collection
    await ParkingTicket.findByIdAndDelete(ticketId);

    res
      .status(200)
      .json({ message: "Ticket moved to deleted collection successfully" });
  } catch (error) {
    console.error("Error moving ticket:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const restoreTicketFromDeleted = async (req, res) => {
  const { ticketId } = req.params; // Assuming ticketId is passed as a URL parameter

  try {
    // Find the ticket in the deleted collection
    const deletedTicket = await DeletedParkingTicket.findById(ticketId);

    if (!deletedTicket) {
      return res
        .status(404)
        .json({ message: "Ticket not found in deleted collection" });
    }

    // Create a new ParkingTicket document
    const parkingTicket = new ParkingTicket(deletedTicket.toObject());

    // Save the new ParkingTicket document
    await parkingTicket.save();

    // Remove the ticket from the deleted collection
    await DeletedParkingTicket.findByIdAndDelete(ticketId);

    res
      .status(200)
      .json({ message: "Ticket restored to live collection successfully" });
  } catch (error) {
    console.error("Error restoring ticket:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getAllDeletedTickets = async (req, res) => {
  try {
    const language = getLanguage(req, responses);

    const { search = "", exportFormat } = req.query;
    const { supervisors = [], assistants = [], startDate, endDate } = req.body;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    let match = {};

    if (search) {
      match.$or = [
        { name: { $regex: search, $options: "i" } },
        { vehicleNumber: { $regex: search, $options: "i" } },
        { vehicleType: { $regex: search, $options: "i" } },
        { phoneNumber: { $regex: search, $options: "i" } },
        { "siteDetails.name": { $regex: search, $options: "i" } },
        { "parkingAssistantDetails.name": { $regex: search, $options: "i" } },
        { "parkingAssistantDetails.phone": { $regex: search, $options: "i" } },
        {
          "parkingAssistantDetails.supervisorCode": {
            $regex: search,
            $options: "i",
          },
        },
        { "supervisorDetails.name": { $regex: search, $options: "i" } },
      ];
    }

    if (supervisors.length > 0) {
      match.supervisor = {
        $in: supervisors.map((id) => new mongoose.Types.ObjectId(id)),
      };
    }

    if (assistants.length > 0) {
      match.parkingAssistant = {
        $in: assistants.map((id) => new mongoose.Types.ObjectId(id)),
      };
    }

    if (startDate || endDate) {
      const dateRange = {};
      if (startDate) {
        const LocalStartDate = moment
          .tz(new Date(startDate), "Asia/Kolkata")
          .startOf("day")
          .clone()
          .utc();
        dateRange.$gte = new Date(LocalStartDate);
      }
      if (endDate) {
        const LocalEndDate = moment
          .tz(new Date(endDate), "Asia/Kolkata")
          .endOf("day")
          .clone()
          .utc();
        const end = new Date(LocalEndDate);
        dateRange.$lte = end;
      }
      match.createdAt = dateRange;
    }

    const aggregateQuery = [
      {
        $lookup: {
          from: "users",
          localField: "parkingAssistant",
          foreignField: "_id",
          as: "parkingAssistantDetails",
        },
      },
      // { $unwind: "$parkingAssistantDetails" },
      {
        $unwind: {
          path: "$parkingAssistantDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "supervisor",
          foreignField: "_id",
          as: "supervisorDetails",
        },
      },
      // { $unwind: "$supervisorDetails" },
      {
        $unwind: {
          path: "$supervisorDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "sites",
          localField: "siteDetails",
          foreignField: "_id",
          as: "siteDetails",
        },
      },
      {
        $unwind: {
          path: "$siteDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: match, // Combined match conditions
      },
      { $sort: { createdAt: -1 } },
    ];
    if (exportFormat !== "excel" && exportFormat !== "pdf") {
      aggregateQuery.push({ $skip: (page - 1) * limit }, { $limit: limit });
    }

    const parkingTickets = await DeletedParkingTicket.aggregate(aggregateQuery);

    if (exportFormat === "excel") {
      return exportToExcel(parkingTickets, res);
    } else if (exportFormat === "pdf") {
      return exportToPDF(parkingTickets, res);
    }

    const countQuery = [
      {
        $lookup: {
          from: "users",
          localField: "parkingAssistant",
          foreignField: "_id",
          as: "parkingAssistantDetails",
        },
      },
      // { $unwind: "$parkingAssistantDetails" },
      {
        $unwind: {
          path: "$parkingAssistantDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "supervisor",
          foreignField: "_id",
          as: "supervisorDetails",
        },
      },
      // { $unwind: "$supervisorDetails" },
      {
        $unwind: {
          path: "$supervisorDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "sites",
          localField: "siteDetails",
          foreignField: "_id",
          as: "siteDetails",
        },
      },
      {
        $unwind: {
          path: "$siteDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: match, // Combined match conditions
      },
      { $count: "totalCount" },
    ];

    const countResult = await DeletedParkingTicket.aggregate(countQuery);
    const count = countResult.length > 0 ? countResult[0].totalCount : 0;

    return res.status(200).json({
      result: {
        parkingTickets,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        totalCount: count,
      },
    });
  } catch (err) {
    console.log({ err });
    res.status(500).json({ message: err.message || err });
  }
};
