import VehicleType from "../models/vehicleType.model.js"; // Assuming your model file is in 'models/user.model.js'
import path from "path";
import { __dirname } from "../utils/helperFunctions.js";
import fs from "fs";

export const createVehicleType = async (req, res) => {
  try {
    const { name } = req.body;
    const hourlyPrices = JSON.parse(req.body.hourlyPrices); // Parse hourlyPrices from JSON string to array of objects
    const imageUrl = req.file ? `/images/${req.file.filename}` : ""; // Generate the URL based on the saved path
    // name.trim.
    console.log({ name, imageUrl, hourlyPrices });
    const newVehicleType = new VehicleType({
      name,
      image: imageUrl,
      hourlyPrices,
    });
    await newVehicleType.save();
    return res
      .status(201)
      .json({ message: "New vehical type created.", result: newVehicleType });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getAllVehicleType = async (req, res) => {
  try {
    const vehicleTypes = await VehicleType.find({});

    // Construct the full URL for each image
    const vehicleTypesWithImageUrl = vehicleTypes.map((vehicleType) => ({
      ...vehicleType._doc, // Spread the document to include all other fields
      image: `${req.protocol}://${req.get("host")}/api/v1/${vehicleType.image}`, // Construct the full image URL
    }));

    return res.json({
      message: "All vehicle types list.",
      result: vehicleTypesWithImageUrl,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const serveImage = (req, res) => {
  const { imageName } = req.params;
  console.log({ imageName });
  const imagePath = path.join(__dirname, "../images", imageName);
  console.log({ imagePath });
  res.sendFile(imagePath, (err) => {
    if (err) {
      res.status(404).json({ message: "Image not found" });
    }
  });
};

export const getVehicleTypeDetail = async (req, res) => {
  try {
    const vehicleType = await VehicleType.findById(req.params.id);
    if (!vehicleType)
      return res.status(404).json({ message: "Vehicle type not found" });
    return res.json({
      message: "All vehicals details list.",
      result: vehicleType,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateVehicleType = async (req, res) => {
  try {
    const { name } = req.body;
    const hourlyPrices = JSON.parse(req.body.hourlyPrices); // Parse hourlyPrices from JSON string to array of objects

    const newImage = req.file ? `/images/${req.file.filename}` : null; // New image path if uploaded

    const vehicleType = await VehicleType.findById(req.params.id);

    if (!vehicleType) {
      return res.status(404).json({ message: "Vehicle type not found" });
    }

    // If there is a new image, remove the old image from the server
    if (newImage && vehicleType.image) {
      const oldImagePath = path.join(__dirname, "..", vehicleType.image);
      fs.unlink(oldImagePath, (err) => {
        if (err) throw new Error(`Failed to delete old image: ${err.message}`);
      });
    }

    // Update vehicle type fields
    vehicleType.name = name;
    vehicleType.hourlyPrices = hourlyPrices;
    if (newImage) {
      vehicleType.image = newImage;
    }

    await vehicleType.save();
    return res.json({ message: "Vehicle type updated.", result: vehicleType });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteVehicleType = async (req, res) => {
  try {
    const vehicleType = await VehicleType.findById(req.params.id);
    if (!vehicleType) {
      return res.status(404).json({ message: "Vehicle type not found" });
    }

    // Remove the associated image file
    if (vehicleType.image) {
      const imagePath = path.join(__dirname, "../", vehicleType.image);
      fs.unlink(imagePath, (err) => {
        if (err) throw new Error(`Failed to delete old image: ${err.message}`);
      });
    }

    // Delete the vehicle type from the database
    await VehicleType.findByIdAndDelete(req.params.id);

    res.json({ message: "Vehicle type deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
