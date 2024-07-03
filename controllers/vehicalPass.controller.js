import VehiclePass from "../models/vehicalPass.model.js"
import { isEmpty } from "../utils/helperFunctions.js";

// Example: Create a new vehicle pass
export const createVehiclePass = async (req, res) => {
     try {
          const { vehicleNo, expireDate, phone } = req.body;

          if (isEmpty(vehicleNo)) return res.status(202).json({ message: "Vehical number is required please check." });
          const passAvailable = await VehiclePass.find({ vehicleNo, isActive: true })
          if (!isEmpty(passAvailable)) {
               return res.status(202).json({ message: "Pass already present." });
          }

          // console.log(new Date(expireDate), "  --- ", new Date(), "   new Date(expireDate).getTime > ", new Date(expireDate).getTime() > new Date().getTime());
          if (isEmpty(expireDate) || new Date(expireDate).getTime() < new Date().getTime()) return res.status(202).json({ message: "Expiry date is required, It's missing or have incorrect value please check." });
          if (isEmpty(phone) || phone.length != 10) return res.status(202).json({ message: "Phone number is required. It's missing or have incorrect please check." });

          const newPass = new VehiclePass({
               phone,
               vehicleNo,
               expireDate: new Date(expireDate)
          });
          const savedPass = await newPass.save();
          const { _id } = savedPass;
          return res.status(201).json({ message: "Vehical pass created.", result: { vehicleNo, expireDate, phone, _id } });
     } catch (error) {
          res.status(400).json({ error: error.message });
     }
};

// Example: Get all vehicle passes
export const getAllVehiclePasses = async (req, res) => {
     try {
          const passes = await VehiclePass.find();
          if (isEmpty(passes)) {
               return res.status(200).json({ message: "No vehical pass available.", result: passes });
          }
          res.status(200).json({ message: "Here is the passes list.", result: passes });

     } catch (error) {
          res.status(500).json({ error: error.message });
     }
};

// Example: Get vehicle pass by phone or vehicalNo
export const getVehiclePass = async (req, res) => {
     const { filter } = req.params;
     try {
          // Find passes matching the filter
          const passes = await VehiclePass.find({
               $or: [
                    { phone: { $regex: filter, $options: 'i' } }, // Case-insensitive search for phone
                    { vehicleNo: { $regex: filter, $options: 'i' } } // Case-insensitive search for vehicleNo
               ]
          });

          if (passes.length === 0) {
               return res.status(404).json({ message: 'No vehicle passes found' });
          }

          // Check for expired passes and update isActive status
          const currentDate = new Date();
          const updatedPasses = passes.map(pass => {
               if (pass.expireDate < currentDate) {
                    // If pass has expired, update isActive to false
                    pass.isActive = false;
                    // Save the updated pass (optional)
                    pass.save();
               }
               return pass.toObject(); // Convert Mongoose document to plain JavaScript object
          });

          res.status(200).json({ message: 'Here are the passes.', result: updatedPasses });
     } catch (error) {
          res.status(500).json({ error: error.message });
     }
};

export const updateVehiclePass = async (req, res) => {
     const { vehicleNo, expireDate, phone } = req.body;
     const passId = req.params.passId;
     try {
          if (isEmpty(passId)) return res.status(404).json({ message: 'Please provide pass ID' });

          // Check if the pass exists
          const existingPass = await VehiclePass.findById(passId);
          if (!existingPass) {
               return res.status(404).json({ message: 'Vehicle pass not found' });
          }

          const updateObject = {}
          if (!isEmpty(phone)) updateObject.phone = phone;
          if (!isEmpty(vehicleNo)) updateObject.vehicleNo = vehicleNo;
          if (!isEmpty(expireDate)) updateObject.expireDate = new Date(expireDate);

          // Update the pass
          const updatedPass = await VehiclePass.findByIdAndUpdate(
               existingPass._id,
               { $set: updateObject }
          );
          const { _id } = updatedPass;

          return res.status(200).json({ message: "Pass updated successfully.", result: { _id, ...updateObject } });
     } catch (error) {
          return res.status(500).json({ error: error.message });
     }
};


// Example: Delete vehicle pass by pass_id
export const deleteVehiclePass = async (req, res) => {
     try {
          if (isEmpty(req.params.passId)) {
               return res.status(404).json({ error: 'PassId not found please check.' });
          }
          const pass = await VehiclePass.findByIdAndDelete(req.params.passId);
          if (!pass) {
               return res.status(404).json({ error: 'Vehicle pass not found' });
          }
          return res.status(200).json({ message: 'Vehicle pass deleted successfully' });
     } catch (error) {
          return res.status(500).json({ error: error.message });
     }
};

