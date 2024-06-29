import VehicleType from "../models/vehicleType.model.js"; // Assuming your model file is in 'models/user.model.js'

export const createVehicleType = async (req, res) => {
  try {
    const { name, image, hourlyPrices } = req.body;
    console.log({ name, image, hourlyPrices });
    const newVehicleType = new VehicleType({
      name,
      image,
      hourlyPrices,
    });
    await newVehicleType.save();
    return res.status(201).json({ message: "New vehical type created.", result: newVehicleType });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getAllVehicleType = async (req, res) => {
  try {
    const vehicleTypes = await VehicleType.find({});
    return res.json({ message: "All vehicals type list.", result: vehicleTypes });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getVehicleTypeDetail = async (req, res) => {
  try {
    const vehicleType = await VehicleType.findById(req.params.id);
    if (!vehicleType) return res.status(404).json({ message: "Vehicle type not found" });
    return res.json({ message: "All vehicals details list.", result: vehicleType });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateVehicleType = async (req, res) => {
  try {
    const { name, supervisorCode, phone, hourlyPrices, image } = req.body;
    console.log({ id: req.params.id });
    const vehicleType = await VehicleType.findById(req.params.id);
    console.log({ vehicleType });
    if (!vehicleType)
      return res.status(404).json({ message: "Vehicle type not found" });

    vehicleType.name = name;
    vehicleType.supervisorCode = supervisorCode;
    vehicleType.phone = phone;
    vehicleType.hourlyPrices = hourlyPrices;
    vehicleType.image = image;

    await vehicleType.save();
    return res.json({ message: "Vehical type updated.", result: vehicleType });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteVehicleType = async (req, res) => {
  try {
    const vehicleType = await VehicleType.findByIdAndDelete(req.params.id);
    if (!vehicleType)
      return res.status(404).json({ message: "Vehicle type not found" });
    res.json({ message: "Vehicle type deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
