import Attendance from '../models/attendance.model.js';
import Shift from '../models/shift.model.js';
import User from '../models/user.model.js';

// Clock-In
export const clockIn = async (req, res) => {
     const { userId } = req.params;
     console.log("userId: ", userId);
     try {
          // Check if user exists
          const user = await User.findById(userId);
          if (!user) {
               return res.status(404).json({ error: "User not found" });
          }

          // Get current date
          const currentDate = new Date();

          // Check if user has already clocked out for today's shift
          const existingAttendanceToday = await Attendance.findOne({
               userId,
               shiftId: user.shiftId,
               clockOutTime: { $gte: new Date(currentDate.setHours(0, 0, 0, 0)) } // Check if clocked out today
          });
          if (existingAttendanceToday) {
               return res.status(400).json({ error: "User has already clocked out for today's shift" });
          }

          // Check if user is already clocked in for the shift
          const existingClockIn = await Attendance.findOne({
               userId,
               shiftId: user.shiftId,
               clockOutTime: { $exists: false } // Check if clockOutTime does not exist (user is still clocked in)
          });
          if (existingClockIn) {
               return res.status(400).json({ error: "User is already clocked in for the shift" });
          }

          // Get shift details
          const shift = await Shift.findById(user.shiftId);
          if (!shift) {
               return res.status(404).json({ error: "Shift not found" });
          }

          // Parse shift start and end times from Shift collection in HH:MM AM/PM format
          const { shiftStartTime, shiftEndTime } = parseTime(shift.startTime, shift.endTime);

          console.log("shiftStartTime ", shiftStartTime.toLocaleString());
          console.log("shiftEndTime ", shiftEndTime.toLocaleString());

          // Check if current time is within shift start and end times
          const clockInTime = new Date();
          const shiftStartDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), shiftStartTime.getHours(), shiftStartTime.getMinutes());
          const shiftEndDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), shiftEndTime.getHours(), shiftEndTime.getMinutes());

          if (clockInTime < shiftStartDate || clockInTime > shiftEndDate) {
               return res.status(400).json({ error: "You can only clock in during your shift hours" });
          }

          // Check if user is late more than 45 minutes from shift start time
          const lateThreshold = new Date(shiftStartDate.getTime() + 45 * 60000); // 45 minutes in milliseconds
          const isLateToday = clockInTime > lateThreshold;
          await User.findByIdAndUpdate(userId, { isOnline: true });

          // Create attendance record
          const attendance = await Attendance.create({ userId, shiftId: user.shiftId, clockInTime, isLateToday });
          return res.status(200).json({ message: "Clocke-In successfully. Hope you are doing well." });

     } catch (error) {
          console.error("Error: ", error);
          res.status(500).json({ error: error.message });
     }
};

// Clock-out
export const clockOut = async (req, res) => {
     const { userId } = req.params;

     try {
          // Check if user exists
          const user = await User.findById(userId);
          if (!user) {
               return res.status(404).json({ error: "User not found." });
          }

          // Check if user has clocked in for the shift
          const attendance = await Attendance.findOne({ userId, shiftId: user.shiftId, clockOutTime: { $exists: false } });
          if (!attendance) {
               return res.status(400).json({ error: "User has not clocked in for this shift" });
          }

          // Update attendance record with clockOutTime and remark
          const updatedAttendance = await Attendance.findOneAndUpdate(
               { userId, shiftId: user.shiftId },
               { clockOutTime: new Date() },
               { new: true }
          );

          if (!updatedAttendance) {
               return res.status(404).json({ error: "Attendance record not found" });
          }
          await User.findByIdAndUpdate(userId, { isOnline: false});

          return res.status(200).json({ message: "Clocke-out successfully. See you tomorrow." });

          // res.json(updatedAttendance);
     } catch (error) {
          res.status(500).json({ error: error.message });
     }
};

function parseTime(startTime, endTime) {
     const [startHourMinute, startPeriod] = startTime.split(' ');
     const [endHourMinute, endPeriod] = endTime.split(' ');

     const [startHours, startMinutes] = startHourMinute.split(':');
     let parsedStartHours = parseInt(startHours);

     const [endHours, endMinutes] = endHourMinute.split(':');
     let parsedEndHours = parseInt(endHours);

     // Adjust start hours for PM times
     if (startPeriod === 'PM' && parsedStartHours !== 12) {
          parsedStartHours += 12;
     } else if (startPeriod === 'AM' && parsedStartHours === 12) {
          parsedStartHours = 0;
     }

     // Adjust end hours for PM times
     if (endPeriod === 'PM' && parsedEndHours !== 12) {
          parsedEndHours += 12;
     } else if (endPeriod === 'AM' && parsedEndHours === 12) {
          parsedEndHours = 0;
     }

     // Get current date
     const currentDate = new Date();

     // Create Date object for start time
     const shiftStartTime = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), parsedStartHours, parseInt(startMinutes));

     // Create Date object for end time
     let shiftEndTime;
     if (parsedEndHours < parsedStartHours || (parsedEndHours === parsedStartHours && parseInt(endMinutes) < parseInt(startMinutes))) {
          // End time is on the next day
          shiftEndTime = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1, parsedEndHours, parseInt(endMinutes));
     } else {
          // End time is on the same day
          shiftEndTime = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), parsedEndHours, parseInt(endMinutes));
     }

     return { shiftStartTime, shiftEndTime };
}
