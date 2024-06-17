import dotenv from "dotenv";
import express from 'express';
import cors from "cors";
import mongoose from "mongoose";
import user from "./routes/user.js"
dotenv.config();

const app = express();
app.use(express.json())

const PORT = process.env.PORT || 3000;

const corsOptions = {
     origin: 'http://localhost:5173',
     methods: ['GET', 'POST'],
     allowedHeaders: ['Content-Type'],
     optionsSuccessStatus: 200
};

app.use(cors(corsOptions))

// All the routes middle ware
app.use("/api/v1", user);


app.listen(PORT, async () => {
     // Connect to MongoDB using Mongoose
     console.log("DB_URL ", process.env.DB_URL);
     await mongoose.connect(process.env.DB_URL);
     console.log(`Server is running on port ${PORT}`);
});