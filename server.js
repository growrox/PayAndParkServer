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

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

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
      console.warn(
        "Origin was undefined, handling as same-origin or non-browser client"
      );
      return callback(null, true); // Adjust based on your security needs
    }
    if (whitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"), false);
    }
  },
};

app.use(cors(corsOptions));

// All the routes middle ware
app.use("/api/v1", user);
app.use("/api/v1", ParkingTicket);
app.use("/api/v1", ParkingAssistant);
app.use("/api/v1", Supervisor);
app.use("/api/v1", Accountant);
app.use('/api/v1', ShiftRoutes);
app.use('/api/v1', Attendance);

app.use("/api/v1", vehicleType);

app.listen(PORT, async () => {
  // Connect to MongoDB using Mongoose
  // await mongoose.connect(process.env.DB_URL);
  await mongoose.connect(process.env.DB_URL_PROD);
  console.log(`Server is running on port ${PORT}`);
});
