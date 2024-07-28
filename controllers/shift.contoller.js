import Shift from "../models/shift.model.js";
import { isEmpty } from "../utils/helperFunctions.js";
import { responses } from "../utils/Translate/shift.response.js";
import { getLanguage } from "../utils/helperFunctions.js";

export const createShift = async (req, res) => {
     const language = getLanguage(req,responses); // Get user's language preference
     try {
          const { name, startTime, endTime } = req.body;

          if (isEmpty(name) || isEmpty(startTime) || isEmpty(endTime)) {
               return res.status(400).json({
                    error: responses.errors[language].fieldsMissing,
                    // "Please check the fields you provided."
               });
          }

          // Validate time format for startTime and endTime (HH:mm AM/PM)
          if (!isValidTimeFormat(startTime) || !isValidTimeFormat(endTime)) {
               return res.status(400).json({
                    error: responses.errors[language].invalidTimeFormat,
                    // "Invalid time format for startTime or endTime. Use format HH:MM AM/PM"
               });
          }

          // Create the shift if validations pass
          const shift = await Shift.create({ name, startTime, endTime });
          return res.status(201).json({
               message: responses.messages[language].shiftCreated,
               // "New shift is created."
               result: shift
          });
     } catch (error) {
          return res.status(500).json({ error: error.message });
     }
};

export const getShift = async (req, res) => {
     const language = getLanguage(req,responses); // Get user's language preference
     try {
          const shift = await getShiftList();
          if (isEmpty(shift)) {
               return res.status(404).json({
                    message: responses.messages[language].noShiftFound,
                    // "No shift found."
                    result: []
               });
          }
          return res.status(200).json({
               message: responses.messages[language].shiftList,
               // "Here is the shift list."
               result: shift
          });
     } catch (error) {
          return res.status(500).json({ error: error.message });
     }
};

export const updateShift = async (req, res) => {
     const language = getLanguage(req,responses); // Get user's language preference
     const { id } = req.params;
     const { name, startTime, endTime } = req.body;

     try {
          // Validate time format (HH:MM AM/PM)
          const timeFormat = /^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/;
          if (!timeFormat.test(startTime) || !timeFormat.test(endTime)) {
               return res.status(400).json({
                    error: responses.errors[language].invalidTimeFormat,
                    // 'Invalid time format. Use HH:MM AM/PM.'
               });
          }

          // Check if shift with given ID exists
          const existingShift = await Shift.findById(id);
          if (!existingShift) {
               return res.status(404).json({
                    error: responses.errors[language].shiftNotFound,
                    // 'Shift not found. Please check the shift ID.'
               });
          }

          // Update shift details
          existingShift.name = name;
          existingShift.startTime = startTime;
          existingShift.endTime = endTime;

          // Save updated shift
          await existingShift.save();

          return res.status(200).json({
               message: responses.messages[language].shiftUpdated,
               // "Shift updated successfully."
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
     // Regular expression to validate time format HH:mm AM/PM
     const regex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9] (AM|PM)$/;
     return regex.test(time);
}

export async function getShiftList() {
     try {
          // Fetch the list of shifts   
          const shift = await Shift.find();
          return shift;
     } catch (error) {
          return [];
     }
}