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
import Attendance from "./routes/attendence.route.js";
import VehicalPass from "./routes/vehicalPass.route.js";
import Razorpay from "razorpay";
import cron from "node-cron"
import fs from "fs"
import path from "path"

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

app.use("/api/v1", vehicleType);




//Remove this code in production of liver server

// ----------------------------

const jsonFilePath = './data.json'; // Path to your JSON file

// Initialize or load the current count
let currentCount = 0;

try {
  const data = fs.readFileSync(jsonFilePath, 'utf8');
  const jsonData = JSON.parse(data);
  currentCount = jsonData.totalCount;
} catch (err) {
  console.error('Error reading JSON file:', err);
}

// Define the cron job to run every 5 minutes
cron.schedule('* */7 * * * *', () => {
  console.log("Cron run --- ");
  // Increment the count
  currentCount++;

  // Prepare updated data
  const newData = {
    totalCount: currentCount,
    updatedAt: new Date().toISOString()
  };

  // Write to JSON file
  fs.writeFile(jsonFilePath, JSON.stringify(newData, null, 2), 'utf8', (err) => {
    if (err) {
      console.error('Error writing JSON file:', err);
    } else {
      console.log(`JSON file updated: Total count is now ${currentCount}`);
    }
  });
}, {
  scheduled: true,
  timezone: 'Asia/Kolkata' // Adjust timezone as per your location
});

console.log('Cron job started.');

//-----------







app.listen(PORT, async () => {
  // Connect to MongoDB using Mongoose
  await mongoose.connect(process.env.DB_URL);
  // await mongoose.connect(process.env.DB_URL_PROD);
  console.log(`Server is running on port ${PORT}`);
});
