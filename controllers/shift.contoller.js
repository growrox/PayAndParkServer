import Shift from "../models/shift.model.js";
import { isEmpty } from "../utils/helperFunctions.js";

export const createShift = async (req, res) => {
     try {
          const { name, startTime, endTime } = req.body;

          if (isEmpty(name) || isEmpty(startTime) || isEmpty(endTime)) {
               return res.status(400).json({ error: "Please check the fileds you provided." });
          }

          // Validate time format for startTime and endTime (HH:mm)
          if (!isValidTimeFormat(startTime) || !isValidTimeFormat(endTime)) {
               return res.status(400).json({ error: "Invalid time format for startTime or endTime. Use format HH:MM AM/PM" });
          }

          // Create the shift if validations pass
          const shift = await Shift.create({ name, startTime, endTime });
          return res.status(201).json({ message: "New shift is created.", result: shift });
     } catch (error) {
          return res.status(500).json({ error: error.message });
     }
};

export const getShift = async (req, res) => {
     try {
          // Create the shift if validations pass
          const shift = await getShiftList();
          if (isEmpty(shift)) { 
               return res.status(404).json({ message: "No shift found.", result: [] });
          }
          return res.status(200).json({ message: "Here is the shift list.", result: shift });
     } catch (error) {
          return res.status(500).json({ error: error.message });
     }
};

// Update a shift
export const updateShift = async (req, res) => {
     const { id } = req.params;
     const { name, startTime, endTime } = req.body;

     try {
          // Validate time format (HH:MM AM/PM)
          const timeFormat = /^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/;
          if (!timeFormat.test(startTime) || !timeFormat.test(endTime)) {
               return res.status(400).json({ error: 'Invalid time format. Use HH:MM AM/PM.' });
          }

          // Check if shift with given ID exists
          const existingShift = await Shift.findById(id);
          if (!existingShift) {
               return res.status(404).json({ error: 'Shift not found please check the shift id.' });
          }

          // Update shift details
          existingShift.name = name;
          existingShift.startTime = startTime;
          existingShift.endTime = endTime;

          // Save updated shift
          await existingShift.save();

          return res.status(200).json({
               message: "Shift updated successfully.",
               result: {
                    name: existingShift.name,
                    startTime: existingShift.startTime,
                    endTime: existingShift.endTime,
                    shiftId: existingShift._id
               }
          });
     } catch (error) {
          return res.status(500).json({ error: error.message });
     }
};


function isValidTimeFormat(time) {
     // Regular expression to validate time format HH:mm
     const regex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9] (AM|PM)$/;
     return regex.test(time);
}

export async function getShiftList() {
     try {
          // Create the shift if validations pass
          const shift = await Shift.find();
          return shift
     } catch (error) {
          return [];
     }
}