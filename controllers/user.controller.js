// controllers/userController.js

import User from "../models/user.model.js"; // Assuming your model file is in 'models/user.model.js'
import { isEmpty } from "../utils/helperFunctions.js";
import jwt from "jsonwebtoken"

// Create a new user
export const createUser = async (req, res) => {
     const { name, code, phone, role } = req.body;

     try {
          // Check if user with the same phone number already exists
          const existingUser = await User.findOne({ phone: phone });
          if (!isEmpty(existingUser)) {
               console.log("User Already Present ");
               return res.status(400).json({ message: "User already available. Please Login." });
          }

          // Create user based on role
          let newUser;
          if (role === "assistant") {
               // Check if supervisor exists with the provided code
               const supervisorDetails = await User.findOne({ code: code, role: "supervisor" });
               if (isEmpty(supervisorDetails)) {
                    return res.status(404).json({ message: "No supervisor found." });
               }
               console.log("Supervisor Found: ", supervisorDetails.code);
               newUser = await User.create({ name, supervisorCode: code, phone, role: "assistant" });
          } else {
               newUser = new User({ name, code, phone, role });
               await newUser.save();
          }

          // Generate JWT token
          const token = jwt.sign(
               { userId: newUser._id, role: newUser.role },
               process.env.JWT_SECRET, // Your JWT secret key
               { expiresIn: '12h' } // Token expiration time
          );

          // Send response with token and user data
          return res.status(201).json({
               message: "Account Created.",
               data: {
                    name: newUser.name,
                    phone: newUser.phone,
                    token: token
                },
          });

     } catch (err) {
          console.error("Error creating user:", err);
          if (err.code === 11000) {
               return res.status(400).json({ message: "User already exists with given details.", code: err.code });
          }
          return res.status(400).json({ message: err.message, code: err.code });
     }
};

// Get all users
export const getUsers = async (req, res) => {
     try {
          const users = await User.find({}, {
               _id: 0,
               name: 1,
               code: 1,
               phone: 1,
               role: 1,
               supervisorCode: 1
          });
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
          const user = await User.findOne({ phone }, {
               _id: 0,
               name: 1,
               code: 1,
               phone: 1,
               role: 1,
               supervisorCode: 1
          });
          if (isEmpty(user)) {
               return res.status(404).json({ message: 'User not found' });
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
          const updatedUser = await User.findByIdAndUpdate(id, { name, code, phone, role }, { new: true });
          if (!updatedUser) {
               return res.status(404).json({ message: 'User not found' });
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
               return res.status(404).json({ message: 'User not found' });
          }
          res.json({ message: 'User deleted successfully' });
     } catch (err) {
          res.status(500).json({ message: err.message });
     }
};



