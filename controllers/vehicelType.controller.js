import VehicleType from "../models/vehicleType.model.js"; // Assuming your model file is in 'models/user.model.js'
import path from "path";
import { __dirname, isEmpty } from "../utils/helperFunctions.js";
import fs from "fs";
import { getLanguage } from "../utils/helperFunctions.js";
import { responses } from "../utils/Translate/vehicalType.response.js";

export const createVehicleType = async (req, res) => {
  const language = getLanguage(req, responses);
  try {
    const { name, gstPercentage } = req.body;
    const hourlyPrices = JSON.parse(req.body.hourlyPrices);
    const imageUrl = req.file
      ? `/images/${req.params.folderName}/${req.file.filename}`
      : "";

    const newVehicleType = new VehicleType({
      name,
      gstPercentage,
      image: imageUrl,
      hourlyPrices,
    });

    if (isEmpty(gstPercentage) || +gstPercentage < 0) {
      return res.status(202).json({ error: "GST percentage is required." });
    }

    await newVehicleType.save();
    return res.status(201).json({
      message: responses.messages[language].vehicleTypeCreatedSuccessfully,
      result: newVehicleType
    });
  } catch (error) {
    console.error({ error });
    return res.status(500).json({ error: responses.errors[language].internalServerError });
  }
};

export const getAllVehicleType = async (req, res) => {
  const language = getLanguage(req, responses);

  try {
    const vehicleTypes = await VehicleType.find({});

    const vehicleTypesWithImageUrl = vehicleTypes.map((vehicleType) => ({
      ...vehicleType._doc,
      hourlyPrices: vehicleType._doc.hourlyPrices.map(el => {
        return { ...el._doc, price: el.price + Math.round(+el.price * (vehicleType.gstPercentage / 100)) };
      }),
      image: `${req.protocol}://${req.get("host")}/api/v1/${vehicleType.image}`,
    }));

    return res.status(200).json({
      message: responses.messages[language].allVehicleTypesList,
      result: vehicleTypesWithImageUrl
    });
  } catch (error) {
    return res.status(500).json({ error: responses.errors[language].internalServerError });
  }
};

export const serveImage = (req, res) => {
  const language = getLanguage(req, responses);

  try {
    const { imageName, folderName } = req.params;
    const imagePath = path.join(__dirname, "../images/", folderName, imageName);
    return res.sendFile(imagePath, (err) => {
      if (err) {
        return res.status(404).json({ error: responses.errors[language].imageNotFound });
      }
    });
  } catch (error) {
    return res.status(500).json({ error: responses.errors[language].internalServerError });
  }
};

export const getVehicleTypeDetail = async (req, res) => {
  const language = getLanguage(req, responses);

  try {

    let vehicleType = await VehicleType.findById(req.params.id);
    if (!vehicleType) {
      return res.status(404).json({ error: responses.errors[language].vehicleTypeNotFound });
    }

    vehicleType.image = `${req.protocol}://${req.get("host")}/api/v1/${vehicleType.image}`;

    const myvehicalnewPrice = vehicleType.hourlyPrices.map(el => {

      return {
        ...el._doc,
        includingGst: el.price + Math.round(+el.price * (vehicleType.gstPercentage / 100)),
      };
    })

    return res.status(200).json({
      message: responses.messages[language].vehicleTypeDetail,
      result: { ...vehicleType._doc, hourlyPrices: myvehicalnewPrice }
    });
  } catch (error) {
    console.log("Error ", error)
    return res.status(500).json({ error: responses.errors[language].internalServerError });
  }
};

export const updateVehicleType = async (req, res) => {
  const language = getLanguage(req, responses);

  try {
    const { name, gstPercentage } = req.body;
    const hourlyPrices = JSON.parse(req.body.hourlyPrices);
    const newImage = req.file ? `images/vehicle-type/${req.file.filename}` : null;

    const vehicleType = await VehicleType.findById(req.params.id);
    if (!vehicleType) {
      return res.status(404).json({ error: responses.errors[language].vehicleTypeNotFound });
    }

    if (newImage && vehicleType.image) {
      const oldImagePath = path.join(__dirname, "..", vehicleType.image);
      fs.unlink(oldImagePath, (err) => {
        if (err) {
          console.log(`Failed to delete old image: ${err}`);
        }
      });
    }

    vehicleType.name = name;
    if (!isEmpty(gstPercentage)) {
      vehicleType.gstPercentage = gstPercentage;
    }
    vehicleType.hourlyPrices = hourlyPrices;
    if (newImage) {
      vehicleType.image = newImage;
    }

    await vehicleType.save();
    return res.status(200).json({
      message: responses.messages[language].vehicleTypeUpdatedSuccessfully,
      result: vehicleType
    });
  } catch (error) {
    return res.status(500).json({ error: responses.errors[language].internalServerError });
  }
};

export const deleteVehicleType = async (req, res) => {
  const language = getLanguage(req, responses);

  try {
    const vehicleType = await VehicleType.findById(req.params.id);
    if (!vehicleType) {
      return res.status(404).json({ error: responses.errors[language].vehicleTypeNotFound });
    }

    if (vehicleType.image) {
      const imagePath = path.join(__dirname, "../", vehicleType.image);
      fs.unlink(imagePath, (err) => {
        if (err) {
          console.log(`Failed to delete image: ${err}`);
        }
      });
    }

    await VehicleType.findByIdAndDelete(req.params.id);
    return res.status(200).json({ message: responses.messages[language].vehicleTypeDeletedSuccessfully });
  } catch (error) {
    return res.status(500).json({ error: responses.errors[language].internalServerError });
  }
};
