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

    const uniqueSiteIds = uniqueSiteIdsResult[0].siteIds;

    // Step 2: Lookup site details based on unique siteIds
    const sites = await Site.find({
      _id: { $in: uniqueSiteIds }
    }).select('_id name'); // Adjust field selection as needed

    res.json({ result: sites });
  } catch (error) {
    console.error("Error getting sites by supervisor.",error);
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
    console.error("Error getting ticket stats by sites.",error);
    res.status(500).json({ message: error.message });
  }
};


