import VehiclePass from "../models/vehicalPass.model.js";
import { isEmpty } from "../utils/helperFunctions.js";
import { getLanguage } from "../utils/helperFunctions.js";
import { responses } from "../utils/Translate/vehicalPass.response.js";


export const createVehiclePass = async (req, res) => {
  const language = getLanguage(req,responses);
  try {
    const {
      vehicleNo, phone, name, vehicleType, vehicleModel, vehicleColor, passExpiryDate, insuranceExpiryDate
    } = req.body;

    if (isEmpty(vehicleNo))
      return res.status(400).json({ error: responses.errors[language].vehicleNoRequired });

    const passAvailable = await VehiclePass.find({ vehicleNo, isActive: true });
    if (!isEmpty(passAvailable)) {
      return res.status(400).json({ error: responses.errors[language].passAlreadyPresent });
    }

    if (isEmpty(passExpiryDate) || new Date(passExpiryDate).getTime() < new Date().getTime())
      return res.status(400).json({ error: responses.errors[language].invalidPassExpiryDate });

    if (isEmpty(insuranceExpiryDate) || new Date(insuranceExpiryDate).getTime() < new Date().getTime())
      return res.status(400).json({ error: responses.errors[language].invalidInsuranceExpiryDate });

    if (isEmpty(phone) || phone.length !== 10)
      return res.status(400).json({ error: responses.errors[language].invalidPhoneNumber });

    const newPass = new VehiclePass({
      phone,
      vehicleNo,
      passExpiryDate: new Date(passExpiryDate),
      name,
      vehicleType,
      vehicleModel,
      vehicleColor,
      insuranceExpiryDate
    });
    const savedPass = await newPass.save();
    const { _id } = savedPass;
    return res.status(201).json({
      message: responses.messages[language].vehiclePassCreatedSuccessfully,
      result: {
        vehicleNo, passExpiryDate, phone, _id, name, vehicleType, vehicleModel, vehicleColor
      },
    });
  } catch (error) {
    res.status(500).json({ error: responses.errors[language].internalServerError });
  }
};


// Example: Get all vehicle passes
export const getAllVehiclePasses = async (req, res) => {
  const language = getLanguage(req,responses);
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const passes = await VehiclePass.find().sort({ createdAt: -1 }).skip(skip).limit(limit);
    const totalCount = await VehiclePass.countDocuments();

    if (passes.length === 0) {
      return res.status(200).json({ message: responses.messages[language].noVehiclePassAvailable, result: passes });
    }

    return res.status(200).json({
      message: responses.messages[language].vehiclePassesList,
      result: {
        passes,
        currentPage: page,
        totalItems: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        perPage: limit,
      },
    });
  } catch (error) {
    res.status(500).json({ error: responses.errors[language].internalServerError });
  }
};


// Example: Get vehicle pass by name, phone or vehicalNo
export const getVehiclePass = async (req, res) => {
  const { filter } = req.params;
  const language = getLanguage(req,responses);
  try {
    const passes = await VehiclePass.find({
      $or: [
        { name: { $regex: filter, $options: "i" } },
        { phone: { $regex: filter, $options: "i" } },
        { vehicleNo: { $regex: filter, $options: "i" } },
      ],
    });

    if (passes.length === 0) {
      return res.status(404).json({ error: responses.errors[language].noVehiclePassesFound });
    }

    const currentDate = new Date();
    const updatedPasses = passes.map((pass) => {
      if (pass.expiryDate < currentDate) {
        pass.isActive = false;
        pass.save();
      }
      return pass.toObject();
    });

    return res.status(200).json({
      message: responses.messages[language].vehiclePassesFound,
      result: updatedPasses
    });
  } catch (error) {
    res.status(500).json({ error: responses.errors[language].internalServerError });
  }
};


export const updateVehiclePass = async (req, res) => {
  const language = getLanguage(req,responses);
  const {
    vehicleNo, phone, name, vehicleType, vehicleModel, vehicleColor, passExpiryDate, insuranceExpiryDate
  } = req.body;
  const passId = req.params.passId;

  try {
    if (isEmpty(passId))
      return res.status(404).json({ error: responses.errors[language].passIdRequired });

    const existingPass = await VehiclePass.findById(passId);

    if (!existingPass) {
      return res.status(404).json({ error: responses.errors[language].vehiclePassNotFound });
    }

    const updateObject = {};
    if (!isEmpty(phone)) updateObject.phone = phone;
    if (!isEmpty(name)) updateObject.name = name;
    if (!isEmpty(vehicleNo)) updateObject.vehicleNo = vehicleNo;
    if (!isEmpty(vehicleType)) updateObject.vehicleType = vehicleType;
    if (!isEmpty(vehicleModel)) updateObject.vehicleModel = vehicleModel;
    if (!isEmpty(vehicleColor)) updateObject.vehicleColor = vehicleColor;
    if (!isEmpty(passExpiryDate)) updateObject.passExpiryDate = new Date(passExpiryDate);
    if (!isEmpty(insuranceExpiryDate)) updateObject.insuranceExpiryDate = new Date(insuranceExpiryDate);

    const updatedPass = await VehiclePass.findByIdAndUpdate(passId, {
      $set: updateObject
    }, { new: true });

    return res.status(200).json({
      message: responses.messages[language].vehiclePassUpdatedSuccessfully,
      result: updatedPass
    });
  } catch (error) {
    return res.status(500).json({ error: responses.errors[language].internalServerError });
  }
};


// Example: Delete vehicle pass by pass_id
export const deleteVehiclePass = async (req, res) => {
  const language = getLanguage(req,responses);
  try {
    if (isEmpty(req.params.passId)) {
      return res.status(404).json({ error: responses.errors[language ].passIdNotFound });
    }

    const pass = await VehiclePass.findByIdAndDelete(req.params.passId);
    if (!pass) {
      return res.status(404).json({ error: responses.errors[language].vehiclePassNotFound });
    }

    return res.status(200).json({ message: responses.messages[language ].vehiclePassDeletedSuccessfully });
  } catch (error) {
    return res.status(500).json({ error: responses.errors[language].internalServerError });
  }
};

