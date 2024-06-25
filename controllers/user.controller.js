// controllers/userController.js

import User from "../models/user.model.js"; // Assuming your model file is in 'models/user.model.js'
import { generateCode, generateOTP, isEmpty } from "../utils/helperFunctions.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import Otp from "../models/otp.model.js";

// Create a new user
export const createUser = async (req, res) => {
     const { name, code, phone, role, password, supervisorCode } = req.body; // Include password in the body for web clients
     const source = req.headers["x-client-source"]; // Client specifies source via headers

     try {
          // Check if user with the same phone number already exists
          if (isEmpty(name)) return res.status(403).json({ message: "Name is a required field." });
          if (isEmpty(phone)) return res.status(403).json({ message: "Phone number is a required field." });

          const existingUser = await User.findOne({ phone: phone });
          if (existingUser) {
               console.log("User Already Present ");
               return res
                    .status(400)
                    .json({ message: "User already available. Please Login." });
          }

          if (source === "app") {
               try {
                    if (isEmpty(supervisorCode)) return res.status(403).json({ message: "supervisorCode is required field." });

                    // Validate OTP for now.
                    const newUser = new User({
                         name,
                         phone,
                         supervisorCode,
                         role: "assistant"
                    })

                    // return res.status(403).json({ message: "Wrong Firebase token." });

               } catch (error) {
                    console.error("Error creating the user account.", error);
                    return res.status(403).json({ message: "Error creating the user account." });
               }
          }

          let newUser;
          if (role === "assistant") {
               const supervisorDetails = await User.findOne({
                    code: code,
                    role: "supervisor",
               });
               if (!supervisorDetails) {
                    return res.status(404).json({ message: "No supervisor found." });
               }
               newUser = new User({
                    name,
                    supervisorCode: code,
                    phone,
                    role: "assistant",
               });
          } else {
               const newUserCode = generateCode(6); // Assume generateCode function exists
               let hashedPassword = password;
               if (password) {
                    hashedPassword = await bcrypt.hash(password, 10); // Hash password for web clients
                    newUser = new User({
                         name,
                         code: newUserCode,
                         phone,
                         role,
                         password: hashedPassword,
                    });
               } else {
                    newUser = new User({
                         name,
                         code: newUserCode,
                         phone,
                         role,
                    });
               }
          }
          await newUser.save();

          // Generate JWT token
          const token = jwt.sign(
               { userId: newUser._id, role: newUser.role },
               process.env.JWT_SECRET, // Your JWT secret key
               { expiresIn: "24h" } // Token expiration time
          );

          // Conditionally handle the response based on the source
          if (source === "web") {
               res.cookie("token", token, {
                    httpOnly: true,
                    secure: true, // Use secure: true in production with HTTPS
                    sameSite: "strict",
                    maxAge: 24 * 60 * 60 * 1000, // 24 hours
               });
               return res.status(201).json({
                    message: "Account Created.",
                    data: { name: newUser.name, phone: newUser.phone },
               });
          } else {
               return res.status(201).json({
                    message: "Account Created.",
                    data: {
                         name: newUser.name,
                         phone: newUser.phone,
                         token: token,
                    },
               });
          }
     } catch (err) {
          console.error("Error creating user:", err);
          if (err.code === 11000) {
               return res.status(400).json({
                    message: "User already exists with given details.",
                    code: err.code,
               });
          }
          return res.status(500).json({ message: err.message, code: err.code });
     }
};

export const loginUser = async (req, res) => {
     const { phone, password } = req.body;
     const source = req.headers["x-client-source"]; // Expecting 'web' or 'app'
     // console.log("source ---", source);

     try {
          if (source === "app") {
               try {
                    const newUser = await User.findOne({ phone: phone })
                    console.log("new User ", newUser);
                    if (isEmpty(newUser) || newUser?.role == "superadmin") {
                         return res.status(404).json({ message: "User not found. Please register." });
                    }

                    const generateOTp = await generateOTP(newUser._id, phone) // UserID, Phone
                    console.log("generateOTp ", generateOTp);

                    if (generateCode.status = "success") {
                         return res.json({ message: "OTP is sent to your registered number please verify.", OTP: generateOTp.OTP });
                    }
                    else {
                         return res.status(500).json({ message: "Error generating the OTP." });
                    }
               } catch (error) {
                    return res.status(500).json({ message: "Error generating the OTP." });
               }
          } else if (source === "web") {
               const user = await User.findOne({ phone: phone });
               if (!user) {
                    return res.status(404).json({ message: "User not found." });
               }
               if (!password) {
                    return res.status(401).json({ message: "Invalid Password" });
               }
               console.log({ password, userPassword: user.password, user });
               if (user.role !== 'superadmin') {
                    return res.status(401).json({ message: "Invalid Role" });
               }
               const passwordMatch = await bcrypt.compare(password, user.password);
               if (!passwordMatch) {
                    return res.status(401).json({ message: "Invalid credentials." });
               }

               const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
                    expiresIn: "24h",
               });
               res.cookie("token", token, {
                    httpOnly: true,
                    secure: true, // Set to true if using HTTPS, required for 'SameSite=None'
                    sameSite: "Strict",
                    maxAge: 86400000, // 24 hours
               });
               user.password = undefined;
               return res.json({ result: user, message: "Login successful." });
          } else {
               return res.status(400).json({ message: "Invalid client source." });
          }
     } catch (err) {
          console.error("Error during login:", err);
          return res
               .status(500)
               .json({ message: "Internal server error.", error: err.message });
     }
};

export const validateOTP = async (req, res) => {
     const { phone, OTP } = req.body;
     // const source = req.headers["x-client-source"]; // This will not be required as this can only be called for app.

     try {
          const newUser = await User.findOne({ phone: phone })
          // console.log("new User ", newUser);

          if (isEmpty(newUser) || newUser?.role == "superadmin") {
               return res.status(404).json({ message: "User not found. Please register." });
          }

          const getOTPDetails = await Otp.findOne({ phoneNumber: phone })
          // console.log("getOTPDetails ", getOTPDetails);


          if (isEmpty(getOTPDetails)) {
               return res.status(404).json({ message: "No OTP found. Please generate new one." });
          }

          // Check if OTP is expired (more than 5 minutes old)
          if (new Date().getTime() > new Date(getOTPDetails.expires_on).getTime()) {
               await Otp.deleteOne({ phoneNumber: phone })
               return res.status(404).json({ message: "OTP expired please generate new one." });
          }
          console.log(OTP, getOTPDetails.OTP, OTP == getOTPDetails.OTP);
          if (OTP == getOTPDetails.OTP) {
               await Otp.deleteOne({ phoneNumber: phone })
               const token = jwt.sign(
                    { userId: newUser._id, role: newUser.role },
                    process.env.JWT_SECRET, // Your JWT secret key
                    { expiresIn: '12h' } // Token expiration time
               );

               return res.status(200).json({ message: "OTP validated successfully.", token });
          }
          else {
               if (!getOTPDetails?.attempts) {
                    await Otp.deleteOne({ phoneNumber: phone })
               }
               else {
                    await Otp.updateOne({ phoneNumber: phone }, { attempts: getOTPDetails?.attempts - 1 })
               }
               return res.status(300).json({ message: `${getOTPDetails?.attempts ? "Wrong OTP try again. Attempts left " + getOTPDetails?.attempts : "Maximum attempts reached generate new OTP."}`, attempts: getOTPDetails?.attempts });
          }
     } catch (error) {
          console.error("Error validating the OTP", error);
          return res.status(500).json({ message: "Error validating the OTP." });

     }
}

// Get all users
export const getUsers = async (req, res) => {
     try {
          const users = await User.find(
               {},
               {
                    _id: 0,
                    name: 1,
                    code: 1,
                    phone: 1,
                    role: 1,
                    supervisorCode: 1,
               }
          );
          if (isEmpty(users)) {
               return res.status(404).json({ message: "No Accounts found." });
          }
          return res.status(200).json(users);
     } catch (err) {
          res.status(500).json({ message: err.message });
     }
};

// Get a single user by ID
export const getUserById = async (req, res) => {
     const { phone } = req.params;
     console.log("Phone ", phone);
     try {
          const user = await User.findOne(
               { phone },
               {
                    _id: 0,
                    name: 1,
                    code: 1,
                    phone: 1,
                    role: 1,
                    supervisorCode: 1,
               }
          );
          if (isEmpty(user)) {
               return res.status(404).json({ message: "User not found" });
          }
          return res.status(200).json(user);
     } catch (err) {
          return res.status(500).json({ message: err.message });
     }
};

// --------------- For now thsese two routes are not being used.
// Update a user
export const updateUser = async (req, res) => {
     const { id } = req.params;
     const { name, code, phone, role } = req.body;

     try {
          const updatedUser = await User.findByIdAndUpdate(
               id,
               { name, code, phone, role },
               { new: true }
          );
          if (!updatedUser) {
               return res.status(404).json({ message: "User not found" });
          }
          res.json(updatedUser);
     } catch (err) {
          res.status(400).json({ message: err.message });
     }
};

// Delete a user
export const deleteUser = async (req, res) => {
     const { id } = req.params;

     try {
          const deletedUser = await User.findByIdAndDelete(id);
          if (!deletedUser) {
               return res.status(404).json({ message: "User not found" });
          }
          res.json({ message: "User deleted successfully" });
     } catch (err) {
          res.status(500).json({ message: err.message });
     }
};
