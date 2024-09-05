import mongoose from "mongoose";
import ParkingTicket from "../models/parkingTicket.model.js";
import Site from "../models/site.model.js";
import User from "../models/user.model.js";
import { isEmpty } from "../utils/helperFunctions.js";
import Ticket from "../models/parkingTicket.model.js"
// CREATE a new Site
export const createSite = async (req, res) => {
  try {
    const site = new Site(req.body);
    await site.save();
    res.status(201).json({ result: site });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// READ all Sites
export const getAllSites = async (req, res) => {
  try {
    const { search } = req.query;

    // Create a filter object based on search query
    let filter = {};
    if (search) {
      const regex = new RegExp(search, "i"); // 'i' makes it case-insensitive
      filter = {
        $or: [{ name: regex }],
      };
    }

    const sites = await Site.find(filter);
    res.json({ result: sites });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// READ a single Site by ID
export const getSiteById = async (req, res) => {
  try {
    const site = await Site.findById(req.params.id);
    if (!site) {
      return res.status(404).json({ message: "Site not found" });
    }
    res.json({ result: site });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// UPDATE a Site by ID
export const updateSite = async (req, res) => {
  try {
    const site = await Site.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!site) {
      return res.status(404).json({ message: "Site not found" });
    }
    res.json({ result: site });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// DELETE a Site by ID
export const deleteSite = async (req, res) => {
  try {
    const site = await Site.findByIdAndDelete(req.params.id);
    if (!site) {
      return res.status(404).json({ message: "Site not found" });
    }
    res.json({ result: site, message: "Site deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getSitesBySupervisorCode = async (req, res) => {
  try {
    const { supervisorID } = req.params;

    const supervisorDetails = await User.findById(supervisorID);

    if (isEmpty(supervisorDetails)) {
      return res.status(400).json({ message: 'Supervisor details not found.' });
    }

    const uniqueSiteIdsResult = await User.aggregate([
      {
        $match: {
          supervisorCode: supervisorDetails.code
        }
      },
      {
        $group: {
          _id: null,
          siteIds: { $addToSet: "$siteId" }
        }
      },
      {
        $project: {
          _id: 0,
          siteIds: 1
        }
      }
    ]);

    // If no siteIds are found
    if (uniqueSiteIdsResult.length === 0 || !uniqueSiteIdsResult[0].siteIds.length) {
      return res.json({ result: [] });
    }

    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0); // Start of today in UTC

    const endOfToday = new Date();
    endOfToday.setUTCHours(23, 59, 59, 999); // End of today in UTC

    // Use aggregation to count occurrences of each vehicle type

    const uniqueSiteIds = uniqueSiteIdsResult[0].siteIds;

    // Step 2: Lookup site details based on unique siteIds
    const sites = await Site.find({
      _id: { $in: uniqueSiteIds }
    }).select('_id name'); // Adjust field selection as needed

    const totalTickets = await Ticket.find(
      {
        siteDetails: { $in: sites.map(site => site._id) },
        createdAt: { $gte: startOfToday, $lte: endOfToday }
      }).countDocuments();

    res.json({
      message: "Here is the all sites details and total ticekt count.",
      result: { sites, totalTickets }
    });
  } catch (error) {
    console.error("Error getting sites by supervisor.", error);
    res.status(500).json({ message: error.message });
  }
};


export const getSiteDetailsAndTickets = async (req, res) => {
  try {
    const { siteID } = req.params;

    // Step 1: Lookup site details based on the provided siteID
    const site = await Site.findById(siteID).select('_id name'); // Adjust field selection as needed

    if (!site) {
      return res.status(404).json({ message: 'Site not found.' });
    }

    // Step 2: Find users associated with the provided siteID and role 'assistant'
    const usersWithSite = await User.find({
      siteId: siteID,
      role: 'assistant'
    });

    if (usersWithSite.length === 0) {
      return res.json({ result: { site, vehicleTypeCounts: [] } });
    }

    // Step 3: Retrieve tickets created today by these users
    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0); // Start of today in UTC

    const endOfToday = new Date();
    endOfToday.setUTCHours(23, 59, 59, 999); // End of today in UTC

    // Use aggregation to count occurrences of each vehicle type
    const vehicleTypeCounts = await Ticket.aggregate([
      {
        $match: {
          parkingAssistant: { $in: usersWithSite.map(user => user._id) },
          createdAt: { $gte: startOfToday, $lte: endOfToday }
        }
      },
      {
        $group: {
          _id: "$vehicleType",
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          vehicleType: "$_id",
          count: 1
        }
      }
    ]);

    // Convert the aggregation result to an array of objects
    const vehicleTypeCountsArray = vehicleTypeCounts.map(({ vehicleType, count }) => ({
      vehicleType,
      count
    }));

    res.json({ result: { site, vehicleTypeCounts: vehicleTypeCountsArray } });
  } catch (error) {
    console.error("Error getting ticket stats by sites.", error);
    res.status(500).json({ message: error.message });
  }
};


export const getAllSitesBySupervisorCode = async (req, res) => {
  try {
    const { supervisorID } = req.params;
    const { startDate, endDate } = req.query;

    // Step 1: Get supervisor details
    const supervisorDetails = await User.findById(supervisorID);
    if (!supervisorDetails) {
      return res.status(400).json({ message: 'Supervisor details not found.' });
    }

    // Step 2: Find assistants mapped to this supervisor
    const assistants = await User.find({
      supervisorCode: supervisorDetails.code,
      role: 'assistant'
    });

    // Get unique siteIds from assistants
    const uniqueSiteIds = assistants.map(assistant => assistant.siteId);

    // Step 3: Validate and parse date parameters
    let startOfDay, endOfDay;

    if (startDate) {
      startOfDay = new Date(startDate);
      if (isNaN(startOfDay.getTime())) {
        return res.status(400).json({ message: 'Invalid start date format.' });
      }
    } else {
      // Default to the start of today if no startDate is provided
      startOfDay = new Date();
      startOfDay.setUTCHours(0, 0, 0, 0);
    }

    if (endDate) {
      endOfDay = new Date(endDate);
      if (isNaN(endOfDay.getTime())) {
        return res.status(400).json({ message: 'Invalid end date format.' });
      }
    } else {
      // Default to the end of today if no endDate is provided
      endOfDay = new Date();
      endOfDay.setUTCHours(23, 59, 59, 999);
    }

    if (startOfDay > endOfDay) {
      return res.status(400).json({ message: 'Start date cannot be after end date.' });
    }

    // Retrieve tickets within the date range
    const ticketsBySite = await Ticket.aggregate([
      {
        $match: {
          siteDetails: { $in: uniqueSiteIds },
          createdAt: { $gte: startOfDay, $lte: endOfDay }
        }
      },
      {
        $group: {
          _id: {
            siteId: "$siteDetails",
            vehicleType: "$vehicleType"
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: "$_id.siteId",
          vehicleTypeCounts: {
            $push: {
              vehicleType: "$_id.vehicleType",
              count: "$count"
            }
          }
        }
      }
    ]);

    // Step 4: Lookup site details for each siteId
    const sites = await Site.find({
      _id: { $in: uniqueSiteIds }
    }).select('_id name');

    // Create a map of siteId to site name for easy lookup
    const siteMap = new Map(sites.map(site => [site._id.toString(), site.name]));

    // Format the results
    const results = ticketsBySite.map(ticketSite => ({
      site: {
        _id: ticketSite._id,
        name: siteMap.get(ticketSite._id.toString())
      },
      vehicleTypeCounts: ticketSite.vehicleTypeCounts
    }));

    res.json({ message: "Here are the site details for the supervisor.", result: results });
  } catch (error) {
    console.error("Error getting sites by supervisor code and tickets.", error);
    res.status(500).json({ message: error.message });
  }
};

