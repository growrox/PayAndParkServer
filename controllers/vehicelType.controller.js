import VehicleType from "../models/vehicleType.model.js"; // Assuming your model file is in 'models/user.model.js'
import path from "path";
import { __dirname } from "../utils/helperFunctions.js";
import fs from "fs";

export const createVehicleType = async (req, res) => {
  try {
    const { name } = req.body;
    const hourlyPrices = JSON.parse(req.body.hourlyPrices); // Parse hourlyPrices from JSON string to array of objects
    const imageUrl = req.file
      ? `/images/${req.params.folderName}/${req.file.filename}`
      : ""; // Generate the URL based on the saved path
    // name.trim.
    console.log({ imageUrl });
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
    res.status(500).json({ error: error.message });
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
    res.status(500).json({ error: error.message });
  }
};

export const serveImage = (req, res) => {
  try {
    const { imageName, folderName } = req.params;
    const imagePath = path.join(__dirname, "../images/", folderName, imageName);
    return res.sendFile(imagePath, (err) => {
      if (err) {
        res.status(404).json({ error: "Image not found" });
      }
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({ error: error });
  }
};

export const getVehicleTypeDetail = async (req, res) => {
  try {
    const vehicleType = await VehicleType.findById(req.params.id);
    vehicleType.image = `${req.protocol}://${req.get("host")}/api/v1/${
      vehicleType.image
    }`;
    if (!vehicleType)
      return res.status(404).json({ error: "Vehicle type not found" });
    return res.json({
      message: "All vehicals details list.",
      result: vehicleType,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateVehicleType = async (req, res) => {
  try {
    const { name } = req.body;
    const hourlyPrices = JSON.parse(req.body.hourlyPrices); // Parse hourlyPrices from JSON string to array of objects

    const newImage = req.file ? `images/vehicle-type/${req.file.filename}` : null; // New image path if uploaded
    const vehicleType = await VehicleType.findById(req.params.id);
    if (!vehicleType) {
      return res.status(404).json({ error: "Vehicle type not found" });
    }

    // If there is a new image, remove the old image from the server
    if (newImage && vehicleType.image) {
      const oldImagePath = path.join(__dirname, "..", vehicleType.image);
      fs.unlink(oldImagePath, (err) => {
        console.log(`Failed to delete old image: ${err}`);
        // if (err) throw new Error(`Failed to delete old image: ${err.message}`);
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
    res.status(500).json({ error: error });
  }
};

export const deleteVehicleType = async (req, res) => {
  try {
    console.log({ id: req.params.id });
    const vehicleType = await VehicleType.findById(req.params.id);
    if (!vehicleType) {
      return res.status(404).json({ error: "Vehicle type not found" });
    }

    // Remove the associated image file
    if (vehicleType.image) {
      const imagePath = path.join(__dirname, "../", vehicleType.image);
      fs.unlink(imagePath, (err) => {
        console.log(`Failed to delete old image: ${err}`);
      });
    }

    // Delete the vehicle type from the database
    await VehicleType.findByIdAndDelete(req.params.id);

    return res.json({ message: "Vehicle type deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
