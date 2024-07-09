import ParkingAssistant from '../models/user.model.js'; // Adjust the path based on your project structure
import dotenv from "dotenv";
dotenv.config(); // Load environment variables from .env file
import jwt from "jsonwebtoken";
import { isEmpty } from "../utils/helperFunctions.js";

const JWT_SECRET = process.env.JWT_SECRET;

const onlineStatusMiddleware = async (req, res, next) => {
     try {

          // Check if authorization header is present
          const authHeader = req.headers.authorization;
          // console.log("headers ", req.headers);
          // const userID = req.headers.userid

          // Split the header into Bearer and the token
          const token = authHeader?.split(" ")[1] || req.headers.cookie?.split("=")[1];
          if (!token) {
               return res.status(401).json({ error: "Authorization token is missing" });
          }

          // Verify JWT token
          jwt.verify(token, JWT_SECRET, async (err, decoded) => {
               if (err) {
                    console.error("JWT verification error:", err);
                    return res.status(406).json({ error: "Failed to authenticate token" });
               }
               // Attach decoded payload to request object
               console.log("decoded ", decoded);

               const { userId, source, role } = decoded

               if (role != "assistant") return res.status(401).json({ error: "You are not authorized for this action." });

               req.headers.role = role;
               req.headers.userId = userId;
               req.headers['x-client-source'] = source;
               // Retrieve assistant based on phone number from request parameter

               const assistant = await ParkingAssistant.findById(userId);

               // Check if assistant exists and is online
               if (!assistant || !assistant.isOnline) {
                    return res.status(403).json({ error: 'Assistant is not available or not online.' });
               }

               // Assistant is online, proceed to next middleware or route handler
               next();
          })
     } catch (error) {
          res.status(500).json({ error: error.message });
     }
};

export default onlineStatusMiddleware;

