import dotenv from "dotenv";
dotenv.config(); // Load environment variables from .env file
import jwt from "jsonwebtoken";
import { isEmpty } from "../utils/helperFunctions.js";

const JWT_SECRET = process.env.JWT_SECRET;

const authMiddleware = (req, res, next) => {
  // Check if authorization header is present
  const authHeader = req.headers.authorization;
  // console.log("headers ", req.headers);
  const userID = req.headers.userid

  if (isEmpty(userID)) return res.status(401).json({ error: "User id is missing in the header." });

  // Split the header into Bearer and the token
  const token = authHeader?.split(" ")[1] || req.headers.cookie?.split("=")[1];
  if (!token) {
    return res.status(401).json({ error: "Token  is missing" });
  }

  // Verify JWT token
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      console.error("JWT verification error:", err);
      return res.status(406).json({ error: "Failed to authenticate token" });
    }
    // Attach decoded payload to request object
    console.log("decoded ", decoded);

    const { userId, source, role } = decoded

    // if (userID != userId) return res.status(401).json({ error: "This token is for different user." });

    req.headers.role = role;
    req.headers['x-client-source'] = source;
    req.headers.userId = userId

    next(); // Pass control to the next middleware or route handler
  });
};

export default authMiddleware;
