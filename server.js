import dotenv from "dotenv";
import express from 'express';
import cors from "cors";
import mongoose from "mongoose";
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

app.get('/api/v1/users', (req, res) => {
     res.send('Hello, World!');
});


app.listen(PORT, async () => {
     // Connect to MongoDB using Mongoose
     console.log("DB_URL ", process.env.DB_URL);
     await mongoose.connect(process.env.DB_URL);
     console.log(`Server is running on port ${PORT}`);
});