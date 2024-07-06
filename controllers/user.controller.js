// controllers/userController.js

import User from "../models/user.model.js"; // Assuming your model file is in 'models/user.model.js'
import {
  generateCode,
  generateOTP,
  isEmpty,
} from "../utils/helperFunctions.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import Otp from "../models/otp.model.js";

// Create a new user
export const createUser = async (req, res) => {
  const { name, phone, role, password, supervisorCode } = req.body; // Include password in the body for web clients
  const source = req.headers["x-client-source"]; // Client specifies source via headers

  try {
    // Check if user with the same phone number already exists
    if (isEmpty(name))
      return res.status(404).json({ message: "Name is a required field." });
    if (isEmpty(phone))
      return res
        .status(404)
        .json({ message: "Phone number is a required field." });

    let newUser;
    const existingUser = await User.findOne({ phone: phone });
    if (existingUser) {
      console.log("User Already Present ", existingUser);
      return res
        .status(400)
        .json({ message: "User already available. Please Login." });
    }

    if (source === "app") {
      try {
        if (isEmpty(supervisorCode))
          return res
            .status(404)
            .json({ message: "supervisorCode is required field." });

        const FindSupervisor = await User.findOne({ code: supervisorCode });

        if (isEmpty(FindSupervisor))
          return res
            .status(404)
            .json({ message: "Please check supervisor code." });

        // Validate OTP for now
        newUser = new User({
          name,
          phone,
          supervisorCode,
          role: "assistant",
          isActivated: false,
        });

        await newUser.save();
        console.log("newUser ---- ", newUser);

        // const token = jwt.sign(
        //      { userId: newUser._id, role: newUser.role, source: "app" },
        //      process.env.JWT_SECRET, // Your JWT secret key
        //      { expiresIn: '24h' } // Token expiration time
        // );
        const otpSent = await generateOTP(newUser._id, phone);
        console.log("otpSent ", otpSent);

        return res
          .status(200)
          .json({ message: "Please verify otp to activate the account." });
      } catch (error) {
        console.error("Error creating the user account.", error);
        return res
          .status(403)
          .json({ message: "Error creating the user account." });
      }
    } else if (source === "web") {
      if (role === "accountant") {
        newUser = new User({
          name,
          phone,
          role,
        });
      } else if (role === "supervisor") {
        const newUserCode = generateCode(6); // Assume generateCode function exists

        newUser = new User({
          name,
          phone,
          role,
          code: newUserCode,
        });
      } else if (role === "superadmin") {
        const hashedPassword = await bcrypt.hash(password, 10); // Hash password for web clients
        newUser = new User({
          name,
          phone,
          role,
          password: hashedPassword,
        });
      } else {
        return res.status(404).json({ message: "Invalid role type given." });
      }
    } else {
      return res.status(400).json({ message: "Invalid client source." });
    }

    await newUser.save();
    // Generate JWT token
    const token = jwt.sign(
      {
        userId: newUser._id,
        role: "superadmin",
        source: "web",
      },
      process.env.JWT_SECRET, // Your JWT secret key
      { expiresIn: "24h" } // Token expiration time
    );

    // Conditionally handle the response based on the source
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.SECURE_COOKIE, // Set to true if using HTTPS, required for 'SameSite=None'
      sameSite: process.env.SAME_SITE,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });
    return res.status(201).json({
      message: "Account Created.",
      result: { name: newUser.name, phone: newUser.phone },
    });
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
        const newUser = await User.findOne({ phone: phone });
        console.log("new User ", newUser);
        if (isEmpty(newUser) || newUser?.role == "superadmin") {
          return res
            .status(404)
            .json({ message: "User not found. Please register." });
        }

        const generateOTp = await generateOTP(newUser._id, phone); // UserID, Phone
        console.log("generateOTp ", generateOTp);

        if ((generateCode.status = "success")) {
          return res.json({
            message: "OTP is sent to your registered number please verify.",
            OTP: generateOTp.OTP,
          });
        } else {
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
      if (user.role !== "superadmin") {
        return res.status(401).json({ message: "Invalid Role" });
      }
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        return res.status(401).json({ message: "Invalid credentials." });
      }

      const token = jwt.sign(
        {
          role: "superadmin",
          userId: user._id,
          source: "web",
        },
        process.env.JWT_SECRET,
        {
          expiresIn: "24h",
        }
      );
      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.SECURE_COOKIE, // Set to true if using HTTPS, required for 'SameSite=None'
        sameSite: process.env.SAME_SITE,
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
    const newUser = await User.findOne({ phone: phone });
    // console.log("new User ", newUser);

    if (isEmpty(newUser) || newUser?.role == "superadmin") {
      return res
        .status(404)
        .json({ message: "User not found. Please register." });
    }

    const getOTPDetails = await Otp.findOne({ phoneNumber: phone });
    // console.log("getOTPDetails ", getOTPDetails);

    if (isEmpty(getOTPDetails)) {
      return res
        .status(404)
        .json({ message: "No OTP found. Please generate new one." });
    }

    // Check if OTP is expired (more than 5 minutes old)
    if (new Date().getTime() > new Date(getOTPDetails.expires_on).getTime()) {
      await Otp.deleteOne({ phoneNumber: phone });
      return res
        .status(404)
        .json({ message: "OTP expired please generate new one." });
    }
    console.log(OTP, getOTPDetails.OTP, OTP == getOTPDetails.OTP);
    if (OTP == getOTPDetails.OTP) {
      await Otp.deleteOne({ phoneNumber: phone });
      await User.findByIdAndUpdate(newUser._id, {
        $set: { isActivated: true },
      });
      const token = jwt.sign(
        { userId: newUser._id, role: newUser.role, source: "app" },
        process.env.JWT_SECRET, // Your JWT secret key
        { expiresIn: "12h" } // Token expiration time
      );

      return res.status(200).json({
        message: "OTP validated successfully.",
        token,
        name: newUser.name,
        role: newUser.role,
        userId: newUser._id,
      });
    } else {
      if (!getOTPDetails?.attempts) {
        await Otp.deleteOne({ phoneNumber: phone });
      } else {
        await Otp.updateOne(
          { phoneNumber: phone },
          { attempts: getOTPDetails?.attempts - 1 }
        );
      }
      return res.status(300).json({
        message: `${
          getOTPDetails?.attempts
            ? "Wrong OTP try again. Attempts left " + getOTPDetails?.attempts
            : "Maximum attempts reached generate new OTP."
        }`,
        attempts: getOTPDetails?.attempts,
      });
    }
  } catch (error) {
    console.error("Error validating the OTP", error);
    return res.status(500).json({ message: "Error validating the OTP." });
  }
};

// Function to get all users with pagination and filtering
export const getUsers = async (req, res) => {
  const { page = 1, pageSize = 10, filter, role } = req.query;
  const query = {};

  const orConditions = [];

  // Apply general filter to multiple fields if filter is not empty
  if (!isEmpty(filter)) {
    orConditions.push(
      { name: { $regex: filter.trim(), $options: "i" } },
      { phone: { $regex: filter.trim(), $options: "i" } },
      { code: { $regex: filter.trim(), $options: "i" } },
      { supervisorCode: { $regex: filter.trim(), $options: "i" } }
    );
  }

  // Apply a specific role filter if role is not empty
  if (!isEmpty(role)) {
    orConditions.push({ role: { $regex: role.trim(), $options: "i" } });
  }

  // Only add $or to query if there are conditions to include
  if (orConditions.length > 0) {
    query.$or = orConditions;
  }
  try {
    // Count total documents matching the query
    const totalCount = await User.countDocuments(query);
    const totalPages = Math.ceil(totalCount / pageSize);

    // Return 404 if no users found
    if (totalCount === 0) {
      return res.status(404).json({ message: "No users found." });
    }

    if (page > totalPages) {
      return res.status(400).json({
        message:
          "You have exceeded the available search results. Please check page.",
      });
    }

    // Calculate total pages based on pageSize

    // Find users based on the query, select specific fields, and apply pagination
    const users = await User.find(query)
      .select("name code phone role supervisorCode shiftId isOnline")
      .populate("shiftId")
      .skip((page - 1) * pageSize)
      .limit(parseInt(pageSize))
      .exec();

    // Pagination logic to determine next and previous pages
    let nextPage = null;
    let prevPage = null;

    if (page < totalPages) {
      nextPage = {
        page: parseInt(page) + 1,
        pageSize: parseInt(pageSize),
      };
    }

    if (page > 1) {
      prevPage = {
        page: parseInt(page) - 1,
        pageSize: parseInt(pageSize),
      };
    }

    // Prepare response object with users, pagination details, and totalCount
    const response = {
      users,
      pagination: {
        totalCount,
        totalPages,
        nextPage,
        prevPage,
      },
    };

    // Return successful response with status 200
    return res
      .status(200)
      .json({ message: "Here is users list", result: response });
  } catch (err) {
    // Handle errors and return status 500 with error message
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
    return res.status(200).json({ message: "User found", result: user });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// GEt user status
export const getUserStatus = async (req, res) => {
  const UserId = req.headers.userid;
  try {
    const user = await User.findById(UserId, {
      name: 1,
      isOnline: 1,
      role: 1,
      phone: 1,
    });
    if (isEmpty(user)) {
      return res
        .status(404)
        .json({ message: "User not found please check the userId" });
    }
    return res
      .status(200)
      .json({ message: "Here is the user details", result: user });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// Update a user
export const updateUser = async (req, res) => {
  const { id } = req.params;
  console.log("Id ", id);
  console.log("Data ", req.body);
  const { name, supervisorCode, shiftId } = req.body;

  try {
    const userAvailable = await User.findById(id);

    if (isEmpty(userAvailable)) {
      return res.status(404).json({ message: "User not found" });
    }

    let updateDetails = {};
    if (!isEmpty(name)) {
      updateDetails.name = name;
    }
    if (!isEmpty(supervisorCode)) {
      updateDetails.supervisorCode = supervisorCode;
    }
    if (!isEmpty(shiftId)) {
      updateDetails.shiftId = shiftId;
    }

    console.log("updateDetails ", updateDetails);
    const updatedUser = await User.findByIdAndUpdate(id, updateDetails);

    res.json({ message: "User updated successfully.", result: updateDetails });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// --------------- For now thsese two routes are not being used.

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
