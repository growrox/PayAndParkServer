import Attendance from "../models/attendance.model.js";
import Shift from "../models/shift.model.js";
import User from "../models/user.model.js";
import { isEmpty } from "../utils/helperFunctions.js";
import mongoose from "mongoose";
import { getLanguage } from "../utils/helperFunctions.js";
import { responses } from "../utils/Translate/attendance.response.js";

// Clock-In
export const clockIn = async (req, res) => {
  const { userId } = req.params;
  const { latitude, longitude } = req.query
  const language = getLanguage(req, responses);

  try {

    if (isEmpty(userId)) {
      return res.status(404).json({ error: responses.errors[language].missingRequired, missing: "user Id" });
    }

    if (isEmpty(latitude) || isEmpty(longitude)) {
      return res.status(404).json({ error: responses.errors[language].missingRequired, missing: "Location details." });
    }

    const user = await User.findById(userId);
    if (isEmpty(user)) {
      return res.status(404).json({ error: responses.errors[language].userNotFound });
    }

    const currentDate = new Date();
    const existingAttendanceToday = await Attendance.findOne({
      userId,
      shiftId: user.shiftId,
      clockInTime: { $gte: new Date(currentDate.setHours(0, 0, 0, 0)) },
    });

    if (existingAttendanceToday) {
      return res.status(400).json({ error: responses.errors[language].alreadyClockedOut });
    }

    const existingClockIn = await Attendance.findOne({
      userId,
      shiftId: user.shiftId,
      clockOutTime: { $exists: false },
    });

    if (existingClockIn) {
      return res.status(400).json({ error: responses.errors[language].alreadyClockedIn });
    }

    const shift = await Shift.findById(user.shiftId);
    if (!shift) {
      return res.status(404).json({ error: responses.errors[language].shiftNotFound });
    }

    const { shiftStartTime, shiftEndTime } = parseTime(shift.startTime, shift.endTime);

    const clockInTime = new Date();
    const shiftStartDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      currentDate.getDate(),
      shiftStartTime.getHours(),
      shiftStartTime.getMinutes()
    );
    const shiftEndDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      currentDate.getDate(),
      shiftEndTime.getHours(),
      shiftEndTime.getMinutes()
    );

    if (clockInTime < shiftStartDate || clockInTime > shiftEndDate) {
      return res.status(400).json({ error: responses.errors[language].clockInOutsideHours });
    }

    const lateThreshold = new Date(shiftStartDate.getTime() + 45 * 60000);
    const isLateToday = clockInTime > lateThreshold;
    await User.findByIdAndUpdate(userId, { isOnline: true });

    const attendance = await Attendance.create({
      userId,
      shiftId: user.shiftId,
      clockInTime,
      isLateToday: false,
      clockInLocation: { latitude, longitude }
    });
    return res.status(200).json({ message: responses.messages[language].clockInSuccess });
  } catch (error) {
    console.error("Error: ", error);
    return res.status(500).json({ error: responses.errors[language].serverError });
  }
};

// Clock-Out
export const clockOut = async (req, res) => {
  const { userId } = req.params;
  const { latitude, longitude } = req.query;
  const language = getLanguage(req, responses);

  try {

    if (isEmpty(latitude) || isEmpty(longitude)) {
      return res.status(404).json({ error: responses.errors[language].missingRequired, missing: "Location details." });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: responses.errors[language].userNotFound });
    }

    const attendance = await Attendance.findOne({
      userId,
      shiftId: user.shiftId,
      clockOutTime: { $exists: false },
    });
    if (!attendance) {
      return res.status(400).json({ error: responses.errors[language].notClockedIn });
    }

    const updatedAttendance = await Attendance.findOneAndUpdate(
      { userId, shiftId: user.shiftId },
      {
        clockOutTime: new Date(),
        clockOutLocation: { latitude, longitude }

      },
      { new: true },
    );

    if (!updatedAttendance) {
      return res.status(404).json({ error: responses.errors[language].attendanceNotFound });
    }
    await User.findByIdAndUpdate(userId, { isOnline: false });

    return res.status(200).json({ message: responses.messages[language].clockOutSuccess });
  } catch (error) {
    return res.status(500).json({ error: responses.errors[language].serverError });
  }
};

// Update Attendance
export const updateAttendance = async (req, res) => {
  const { attendanceId } = req.params;
  const { isLateToday } = req.body;
  const language = getLanguage(req, responses);

  try {
    const attendanceAvailable = await Attendance.findById(attendanceId);

    if (isEmpty(attendanceAvailable)) {
      return res.status(404).json({ error: responses.errors[language].attendanceNotFound });
    }

    if (attendanceAvailable.isLateToday == isLateToday) {
      return res.status(202).json({
        message: responses.messages[language].statusUnchanged,
      });
    }

    const updatedDetails = await Attendance.findByIdAndUpdate(attendanceId, {
      isLateToday,
    });

    return res.status(200).json({ message: responses.messages[language].attendanceUpdated });
  } catch (error) {
    return res.status(500).json({ error: responses.errors[language].serverError });
  }
};

// Function to parse time in HH:MM AM/PM format
function parseTime(startTime, endTime) {
  const [startHourMinute, startPeriod] = startTime.split(" ");
  const [endHourMinute, endPeriod] = endTime.split(" ");

  const [startHours, startMinutes] = startHourMinute.split(":");
  let parsedStartHours = parseInt(startHours);

  const [endHours, endMinutes] = endHourMinute.split(":");
  let parsedEndHours = parseInt(endHours);

  if (startPeriod === "PM" && parsedStartHours !== 12) {
    parsedStartHours += 12;
  } else if (startPeriod === "AM" && parsedStartHours === 12) {
    parsedStartHours = 0;
  }

  if (endPeriod === "PM" && parsedEndHours !== 12) {
    parsedEndHours += 12;
  } else if (endPeriod === "AM" && parsedEndHours === 12) {
    parsedEndHours = 0;
  }

  const currentDate = new Date();

  const shiftStartTime = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    currentDate.getDate(),
    parsedStartHours,
    parseInt(startMinutes)
  );

  let shiftEndTime;
  if (
    parsedEndHours < parsedStartHours ||
    (parsedEndHours === parsedStartHours &&
      parseInt(endMinutes) < parseInt(startMinutes))
  ) {
    shiftEndTime = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      currentDate.getDate() + 1,
      parsedEndHours,
      parseInt(endMinutes)
    );
  } else {
    shiftEndTime = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      currentDate.getDate(),
      parsedEndHours,
      parseInt(endMinutes)
    );
  }

  return { shiftStartTime, shiftEndTime };
}

// Auto Clock-Out User Function
export async function AutoClockOutUser(shiftId) {
  try {
    await Attendance.updateMany(
      { shiftId: new mongoose.Types.ObjectId(shiftId) },
      { clockOutTime: new Date() }
    );
    await User.updateMany(
      { shiftId: new mongoose.Types.ObjectId(shiftId) },
      { isOnline: false }
    );
    return true;
  } catch (error) {
    console.log("Error clocking out the users. ", error);
    return false;
  }
}

// Get Attendance by Month
export const getAttendanceByMonth = async (req, res) => {
  const { userId, year, month } = req.query;
  const language = getLanguage(req, responses);

  try {
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, Number(month) + 1, 0);
    const attendance = await Attendance.find({
      userId,
      clockInTime: { $gte: startDate, $lte: endDate },
    })
      .populate("shiftId")
      .exec();

    res.status(200).json({ result: attendance });
  } catch (error) {
    res.status(500).json({ message: responses.errors[language].serverError, error });
  }
};