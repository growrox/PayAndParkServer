import mongoose from "mongoose";
import ParkingTicket from "../models/parkingTicket.model.js";
import Site from "../models/site.model.js";
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

export const getSiteDetailsBySupervisor = async (req, res) => {
  const { supervisorId } = req.query;

  if (!mongoose.Types.ObjectId.isValid(supervisorId)) {
    return res.status(400).json({ message: "Invalid supervisor ID" });
  }

  try {
    // Aggregate ticket data based on supervisor ID
    const ticketsSummary = await ParkingTicket.aggregate([
      // Match tickets based on the supervisor ID
      {
        $match: {
          supervisor: new mongoose.Types.ObjectId(supervisorId),
        },
      },
      // Group by site and vehicle type, then sum the amounts
      {
        $group: {
          _id: {
            site: "$siteDetails",
            vehicleType: "$vehicleType",
          },
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 }, // Count the number of tickets for each vehicle type per site
        },
      },
      {
        $lookup: {
          from: "sites", // Assuming the collection name is 'sites'
          localField: "_id.site",
          foreignField: "_id",
          as: "siteDetails",
        },
      },
      {
        $unwind: "$siteDetails",
      },
      {
        $project: {
          siteName: "$siteDetails.name",
          vehicleType: "$_id.vehicleType",
          totalAmount: 1,
          count: 1,
          _id: 0,
        },
      },
    ]);

    return res.status(200).json({ result: ticketsSummary });
  } catch (error) {
    console.error("Error fetching site details:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};
