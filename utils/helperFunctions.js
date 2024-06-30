import Otp from "../models/otp.model.js";
import { fileURLToPath } from 'url';
import path from 'path';

export const isEmpty = (value) => {
  if (value === null || value === undefined) {
    return true;
  } else if (typeof value === "object") {
    return Object.keys(value).length === 0;
  } else if (Array.isArray(value)) {
    return value.length === 0;
  } else if (typeof value === "string") {
    return value.trim() === "";
  } else {
    return false;
  }
};

export const generateCode = (length = 6) => {
  let result = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};

export const generateOTP = async (userID, phoneNumber) => {
  try {
    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Save OTP to MongoDB
    const otpRecord = await Otp.updateOne(
      { userID, phoneNumber }, // Filter criteria to find the OTP record
      {
        $set: {
          userID,
          phoneNumber,
          OTP: otp,
          expires_on: new Date(Date.now() + (5 * 60000)) // Set expiry time in minutes
        }
      },
      { upsert: true } // Options to upsert if record doesn't exist
    );
    
    console.log(`Generated OTP ${otp} for userID ${userID} and phone number ${phoneNumber}`);
    return { status: "success", OTP: otp };
  } catch (error) {
    console.error('Error generating OTP:', error);
    // throw error; // Propagate the error back to the caller
    return { status: "error", OTP: "" };

  }
};


export const __filename = fileURLToPath(import.meta.url);
export const __dirname = path.dirname(__filename);


