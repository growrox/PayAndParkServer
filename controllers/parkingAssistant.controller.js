import ParkingAssistant from "../models/user.model.js"; // Import the ParkingAssistant model
import ParkingTicket from "../models/parkingTicket.model.js";
import mongoose from "mongoose";
import { getLanguage } from "../utils/helperFunctions.js";
import { responses } from "../utils/Translate/assistant.response.js";
import User from "../models/user.model.js";

// Create a new parking assistant
export const createParkingAssistant = async (req, res) => {
  const language = getLanguage(req, responses);
  try {
    const { name, supervisorCode, phone, email, address } = req.body;
    const newAssistant = new ParkingAssistant({
      name,
      supervisorCode,
      phone,
      email,
      address,
    });
    const savedAssistant = await newAssistant.save();
    return res.status(201).json({
      message: responses.messages[language].assistantCreated,
      result: savedAssistant,
    });
  } catch (err) {
    return res
      .status(500)
      .json({ error: responses.errors[language].serverError });
  }
};

// Get all parking assistants
export const getAllParkingAssistants = async (req, res) => {
  const language = getLanguage(req, responses);
  try {
    const assistants = await ParkingAssistant.find();
    return res.json({
      message: responses.messages[language].dataFetched,
      result: assistants,
    });
  } catch (err) {
    return res
      .status(500)
      .json({ error: responses.errors[language].serverError });
  }
};

// Get a single parking assistant by ID
export const getParkingAssistantById = async (req, res) => {
  const language = getLanguage(req, responses);
  try {
    const assistant = await ParkingAssistant.findById(req.params.id);
    if (!assistant) {
      return res
        .status(404)
        .json({ error: responses.errors[language].assistantNotFound });
    }
    return res.json(assistant);
  } catch (err) {
    return res
      .status(500)
      .json({ error: responses.errors[language].serverError });
  }
};

// Update a parking assistant by ID
export const updateParkingAssistant = async (req, res) => {
  const language = getLanguage(req, responses);
  try {
    const { name, supervisorCode, phone } = req.body;
    const updatedAssistant = await ParkingAssistant.findByIdAndUpdate(
      req.params.id,
      { name, supervisorCode, phone },
      { new: true }
    );
    if (!updatedAssistant) {
      return res
        .status(404)
        .json({ error: responses.errors[language].assistantNotFound });
    }
    return res.json({
      message: responses.messages[language].detailsUpdated,
      result: updatedAssistant,
    });
  } catch (err) {
    return res
      .status(500)
      .json({ error: responses.errors[language].serverError });
  }
};

// Delete a parking assistant by ID
export const deleteParkingAssistant = async (req, res) => {
  const language = getLanguage(req, responses);
  try {
    const deletedAssistant = await ParkingAssistant.findByIdAndDelete(
      req.params.id
    );
    if (!deletedAssistant) {
      return res
        .status(404)
        .json({ error: responses.errors[language].assistantNotFound });
    }
    return res.json({ message: responses.messages[language].assistantDeleted });
  } catch (err) {
    return res
      .status(500)
      .json({ error: responses.errors[language].serverError });
  }
};

// Get the stats of the tickets for the assistant
export const getTicketsStatsByAssistantId = async (req, res) => {
  const language = getLanguage(req, responses);
  const parkingAssistant = req.headers.userid;

  try {
    const pipeline = [
      {
        $match: {
          parkingAssistant: new mongoose.Types.ObjectId(parkingAssistant),
          status: { $ne: "settled" },
        },
      },
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
          TotalTickets: { $sum: 1 }, // Add total ticket count
        },
      },
      {
        $project: {
          _id: 0,
          TotalAmount: 1,
          TotalCash: 1,
          TotalOnline: 1,
          TotalTickets: 1,
        },
      },
    ];

    const pipeline2 = [
      {
        $match: {
          parkingAssistant: new mongoose.Types.ObjectId(parkingAssistant),
          status: { $ne: "settled" },
        },
      },
      { $sort: { updatedAt: -1 } },
      { $limit: 1 },
      { $project: { LastSettledDate: "$updatedAt" } },
      { $project: { _id: 0 } },
    ];

    const pipeline3 = [
      {
        $match: {
          parkingAssistant: new mongoose.Types.ObjectId(parkingAssistant),
          status: { $ne: "settled" },
        },
      },
      {
        $group: {
          _id: "$vehicleType",
          TicketCount: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          vehicleType: "$_id",
          TicketCount: 1,
        },
      },
    ];

    const [ticketStats, lastSettled, vehicleTypes] = await Promise.all([
      ParkingTicket.aggregate(pipeline),
      ParkingTicket.aggregate(pipeline2),
      ParkingTicket.aggregate(pipeline3),
    ]);

    return res.json(
      ticketStats.length > 0
        ? {
          message: responses.messages[language].settlementsFetched,
          result: {
            ...ticketStats[0],
            LastSettledDate:
              lastSettled.length > 0 ? lastSettled[0].LastSettledDate : null,
            VehicleTypes: vehicleTypes,
          },
        }
        : {
          message: responses.messages[language].noSettlements,
          result: {
            TotalAmount: 0,
            TotalCash: 0,
            TotalOnline: 0,
            TotalTickets: 0,
            LastSettledDate: null,
            VehicleTypes: [],
          },
        }
    );
  } catch (error) {
    return res
      .status(500)
      .json({ message: responses.errors[language].serverError });
  }
};

// Controller function to fetch tickets
export const getTickets = async (req, res) => {
  const language = getLanguage(req, responses);
  try {
    let { page, userid } = req.headers;
    let { searchQuery } = req.query;
    let filter = [];

    const limit =
      page && page === "home" ? 5 : parseInt(req.query.pageSize) || 20;
    const pageNumber = parseInt(req.query.page) || 1;
    const skip = (pageNumber - 1) * limit;

    if (searchQuery) {
      filter.push({ vehicleNumber: { $regex: new RegExp(searchQuery, "i") } });
      filter.push({ phoneNumber: { $regex: new RegExp(searchQuery, "i") } });
      filter.push({ paymentMode: { $regex: new RegExp(searchQuery, "i") } });
      filter.push({ status: { $regex: new RegExp(searchQuery, "i") } });
    }

    let tickets = [];

    if (page === "home") {
      tickets = await ParkingTicket.find({
        parkingAssistant: new mongoose.Types.ObjectId(userid),
      })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("supervisor", "name")
        .populate("settlementId")
        .populate("passId")
        .populate("onlineTransactionId")
        .exec();
    } else {
      if (filter.length > 0) {
        tickets = await ParkingTicket.find({
          parkingAssistant: new mongoose.Types.ObjectId(userid),
          $or: filter,
        })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate("supervisor", "name")
          .populate("settlementId")
          .populate("passId")
          .populate("onlineTransactionId")
          .exec();
      } else {
        tickets = await ParkingTicket.find({
          parkingAssistant: new mongoose.Types.ObjectId(userid),
        })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate("supervisor", "name")
          .populate("settlementId")
          .populate("passId")
          .populate("onlineTransactionId")
          .exec();
      }
    }

    const totalCount = await ParkingTicket.find({
      parkingAssistant: new mongoose.Types.ObjectId(userid),
    }).countDocuments();

    if (tickets.length === 0) {
      return res.status(200).json({
        message: responses.messages[language].noTicketsFound,
        result: { data: [], pagination: { total: 0, limit, pageNumber } },
      });
    }

    let responseObj = {
      message: responses.messages[language].ticketsFetched,
      result: { data: tickets },
    };
    if (!page && page != "home") {
      responseObj["result"] = {
        ...responseObj["result"],
        pagination: { total: totalCount, limit, pageNumber },
      };
    }

    return res.status(200).json(responseObj);
  } catch (err) {
    console.error("Error fetching tickets:", err);
    return res
      .status(500)
      .json({ error: responses.errors[language].serverError });
  }
};

export const getParkingTicketsByDateRange = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const onlineUsers = await User.find({ isOnline: true })

    if (!startDate || !endDate) {
      return res
        .status(400)
        .json({ message: "Please provide both startDate and endDate." });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    console.log({ start: start.toISOString(), end: end.toISOString() });

    end.setDate(end.getDate() + 1); // Include the end date in the range

    // Aggregation to group by date and calculate collections within the range
    const tickets = await ParkingTicket.aggregate([
      {
        $match: {
          createdAt: {
            $gte: start,
            $lt: end,
          },
        },
      },
      {
        $group: {
          _id: {
            day: { $dayOfMonth: "$createdAt" },
            month: { $month: "$createdAt" },
            year: { $year: "$createdAt" },
          },
          totalAmount: { $sum: "$amount" },
          cashTotal: {
            $sum: {
              $cond: [{ $eq: ["$paymentMode", "Cash"] }, "$amount", 0],
            },
          },
          onlineTotal: {
            $sum: {
              $cond: [{ $eq: ["$paymentMode", "Online"] }, "$amount", 0],
            },
          },
          passTotal: {
            $sum: {
              $cond: [{ $eq: ["$paymentMode", "Pass"] }, "$amount", 0],
            },
          },
          freeTotal: {
            $sum: {
              $cond: [{ $eq: ["$paymentMode", "Free"] }, "$amount", 0],
            },
          },
          ticketCount: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    // Prepare data for the line chart
    const chartData = tickets.map((ticket) => ({
      date: `${ticket._id.year}-${String(ticket._id.month).padStart(
        2,
        "0"
      )}-${String(ticket._id.day).padStart(2, "0")}`,
      cashTotal: ticket.cashTotal || 0,
      onlineTotal: ticket.onlineTotal || 0,
      passTotal: ticket.passTotal || 0,
      freeTotal: ticket.freeTotal || 0,
    }));

    res.status(200).json({
      result: {
        dateRange: { startDate, endDate },
        chartData,
        totals: {
          totalAmount: tickets.reduce(
            (acc, ticket) => acc + ticket.totalAmount,
            0
          ),
          cashTotal: tickets.reduce((acc, ticket) => acc + ticket.cashTotal, 0),
          onlineTotal: tickets.reduce(
            (acc, ticket) => acc + ticket.onlineTotal,
            0
          ),
          passTotal: tickets.reduce((acc, ticket) => acc + ticket.passTotal, 0),
          freeTotal: tickets.reduce((acc, ticket) => acc + ticket.freeTotal, 0),
        },
        onlineUsers
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error", error });
  }
};

// Controller function to fetch all tickets from any user
export const getGlobalTickets = async (req, res) => {
  const language = getLanguage(req, responses);
  try {

    let { page, userid } = req.headers;
    let { searchQuery } = req.query;

    if (isEmpty(searchQuery)) {
      return res.status(404).json({ message: responses.errors[language].FilterIsRequired, result: {} });
    }

    const limit = page && page === 'home' ? 5 : parseInt(req.query.pageSize) || 20;
    const pageNumber = parseInt(req.query.page) || 1;
    const skip = (pageNumber - 1) * limit;

    let filter = {};

    if (searchQuery) {
      filter = {
        $or: [
          { vehicleNumber: { $regex: new RegExp(searchQuery, 'i') } },
          { phoneNumber: { $regex: new RegExp(searchQuery, 'i') } }
        ]
      };
    }

    let tickets = [];

    tickets = await ParkingTicket.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('supervisor', 'name')
      .populate('settlementId')
      .populate('passId')
      .populate('onlineTransactionId')
      .exec();

    const totalCount = await ParkingTicket.find({
      parkingAssistant: new mongoose.Types.ObjectId(userid),
    }).countDocuments();

    if (tickets.length === 0) {
      return res.status(200).json({
        message: responses.messages[language].noTicketsFound,
        result: { data: [], pagination: { total: 0, limit, pageNumber } },
      });
    }

    let responseObj = {
      message: responses.messages[language].ticketsFetched,
      result: { data: tickets },
    };
    if (!page && page != "home") {
      responseObj["result"] = {
        ...responseObj["result"],
        pagination: { total: totalCount, limit, pageNumber },
      };
    }

    return res.status(200).json(responseObj);
  } catch (err) {
    console.error('Error fetching tickets:', err);
    return res.status(500).json({ error: responses.errors[language].serverError });
  }
};
