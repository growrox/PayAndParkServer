import dotenv from "dotenv";
dotenv.config(); // Load environment variables from .env file
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

const authMiddleware = (req, res, next) => {
  // Check if authorization header is present
  const authHeader = req.headers.authorization;

  // Split the header into Bearer and the token
  const token = authHeader?.split(" ")[1] || req.headers.cookie?.split("=")[1];
  if (!token) {
    return res.status(401).json({ message: "Token  is missing" });
  }

  // Verify JWT token
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      console.error("JWT verification error:", err);
      return res.status(403).json({ message: "Failed to authenticate token" });
    }
    // Attach decoded payload to request object
    console.log("decoded ", decoded);
    req.user = decoded;
    next(); // Pass control to the next middleware or route handler
  });
};

export default authMiddleware;
