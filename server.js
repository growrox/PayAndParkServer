import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import user from "./routes/user.route.js";
import vehicleType from "./routes/vehicleType.js";
import ParkingTicket from "./routes/ticket.route.js";
import ParkingAssistant from "./routes/assistant.route.js";
import Supervisor from "./routes/supervisor.route.js";
import Accountant from "./routes/accountant.route.js";
import ShiftRoutes from "./routes/shift.route.js";
import SiteRoutes from "./routes/site.routes.js";
import Attendance from "./routes/attendence.route.js";
import VehicalPass from "./routes/vehicalPass.route.js";
import Razorpay from "razorpay";
import cron from "node-cron"
import fs from "fs"
import path from "path"
import { getShiftList } from "./controllers/shift.contoller.js";
import { scheduleCronAfterMinutes } from "./utils/helperFunctions.js";
import { AutoClockOutUser } from "./controllers/attendance.controller.js";


dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

console.log("RAZORPAY_KEY_ID -- ", process.env.RAZORPAY_KEY_ID);
console.log("RAZORPAY_KEY_SECRET -- ", process.env.RAZORPAY_KEY_SECRET);

export const instance = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET })


// const corsOptions = {
//   origin: process.env.PRODUCTION_URL,
//   methods: ["GET", "POST", "PUT", "DELETE"],
//   allowedHeaders: ["Content-Type"],
//   optionsSuccessStatus: 200,
// };
// console.log({ corsOptions });
// app.use(cors(corsOptions));

const whitelist = [
  process.env.DEVELOPMENT_URL,
  process.env.STAGING_URL,
  process.env.PRODUCTION_URL,
];
console.log({ whitelist });

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) {
      console.warn("Origin was undefined, handling as same-origin or non-browser client");
      callback(null, true);
    } else if (whitelist.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"), false);
    }
  },
  credentials: true // Allow credentials
};

app.use(cors(corsOptions));

app.get("/", async (req, resp) => { return resp.json("Server is running. Please check the code developer") })
// All the routes middle ware
app.use("/api/v1", user);
app.use("/api/v1", ParkingTicket);
app.use("/api/v1", ParkingAssistant);
app.use("/api/v1", Supervisor);
app.use("/api/v1", Accountant);
app.use('/api/v1', ShiftRoutes);
app.use('/api/v1', Attendance);
app.use('/api/v1', VehicalPass);
app.use('/api/v1', SiteRoutes);
app.use("/api/v1", vehicleType);


function scheduleShiftCronJobs(shifts) {
  shifts.forEach(shift => {
    // Calculate the cron schedule time (15 minutes after the shift's end time)
    // console.log("endTime ", shift.endTime);
    const cronTime = scheduleCronAfterMinutes(shift.endTime, process.env.AUTO_CLOCKOUT_AFTER || 15)
    // console.log(" cronTime ", cronTime);

    // Define the cron job task

    cron.schedule(cronTime, async () => {
      // cron.schedule("1 2 * * *", async () => {

      const loggedOutUsers = await AutoClockOutUser(shift._id)
      console.log(`All users logged-out for the "${shift.name}" at ${cronTime} Date:- ${new Date()}`);
      // Perform your desired action here
    }, {
      scheduled: true,
      timezone: 'Asia/Kolkata', // Replace with your timezone
    });

    // console.log(`Cron job scheduled for shift "${shift.name}" at ${cronTime}`);
  });
}

async function fetchShiftsAndScheduleJobs() {
  try {
    const shifts = await getShiftList();
    console.log("shifts  ", shifts.length);
    scheduleShiftCronJobs(shifts);
  } catch (error) {
    console.error('Error scheduling cron jobs:', error);
  }
}

// Call the function to initiate the process
fetchShiftsAndScheduleJobs();







app.listen(PORT, async () => {
  // Connect to MongoDB using Mongoose
  await mongoose.connect(process.env.DB_URL);
  // await mongoose.connect(process.env.DB_URL_PROD);
  console.log(`Server is running on port ${PORT}`);
});
