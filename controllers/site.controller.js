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
