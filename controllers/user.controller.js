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
import { responses } from "../utils/Translate/user.response.js";
import { getLanguage } from "../utils/helperFunctions.js";
import mongoose from "mongoose";

// Create a new user
export const createUser = async (req, res) => {
  const { name, phone, role, password, supervisorCode } = req.body;
  const source = req.headers["x-client-source"];
  const language = getLanguage(req, responses); // Fallback to English if language is not set

  try {
    if (isEmpty(name)) {
      return res
        .status(400)
        .json({ error: responses.errors[language].nameRequired });
    }
    if (isEmpty(phone)) {
      return res
        .status(400)
        .json({ error: responses.errors[language].phoneRequired });
    }

    const existingUser = await User.findOne({ phone: phone });
    if (existingUser) {
      console.log("User Already Present ", existingUser);
      return res
        .status(400)
        .json({ error: responses.errors[language].userAlreadyExists });
    }

    let newUser;

    if (source === "app") {
      if (isEmpty(supervisorCode)) {
        return res
          .status(400)
          .json({ error: responses.errors[language].supervisorCodeRequired });
      }

      const FindSupervisor = await User.findOne({ code: supervisorCode });
      if (isEmpty(FindSupervisor)) {
        return res
          .status(404)
          .json({ error: responses.errors[language].invalidSupervisorCode });
      }

      newUser = new User({
        name,
        phone,
        supervisorCode,
        role: "assistant",
        isActivated: false,
      });

      await newUser.save();
      console.log("newUser ---- ", newUser);

      const otpSent = await generateOTP(newUser._id, phone);
      console.log("otpSent ", otpSent);

      return res
        .status(200)
        .json({ message: responses.messages[language].verifyOtp });
    } else if (source === "web") {
      if (role === "accountant") {
        const hashedPassword = await bcrypt.hash(password, 10);
        newUser = new User({
          name,
          phone,
          role,
          password: hashedPassword,
        });
      } else if (role === "supervisor") {
        const newUserCode = generateCode(6);

        newUser = new User({
          name,
          phone,
          role,
          code: newUserCode,
        });
      } else if (role === "superadmin") {
        const hashedPassword = await bcrypt.hash(password, 10);
        newUser = new User({
          name,
          phone,
          role,
          password: hashedPassword,
        });
      } else {
        return res
          .status(400)
          .json({ error: responses.errors[language].invalidRole });
      }

      await newUser.save();
      const token = jwt.sign(
        { userId: newUser._id, role: newUser.role, source: "web" },
        process.env.JWT_SECRET,
        { expiresIn: "24h" }
      );

      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.SECURE_COOKIE === "true",
        sameSite: process.env.SAME_SITE,
        maxAge: 24 * 60 * 60 * 1000,
      });

      return res.status(201).json({
        message: responses.messages[language].accountCreated,
        result: { name: newUser.name, phone: newUser.phone },
      });
    } else {
      return res
        .status(400)
        .json({ error: responses.errors[language].invalidClientSource });
    }
  } catch (err) {
    console.error("Error creating user:", err);
    if (err.code === 11000) {
      return res.status(400).json({
        error: responses.errors[language].userAlreadyExists,
        code: err.code,
      });
    }
    return res
      .status(500)
      .json({
        error: responses.errors[language].internalServerError,
        code: err.code,
      });
  }
};

export const loginUser = async (req, res) => {
  const { phone, password } = req.body;
  const source = req.headers["x-client-source"];
  const language = getLanguage(req, responses); // Fallback to English if language is not set

  try {
    if (source === "app") {
      try {
        const user = await User.findOne({ phone: phone });
        console.log("Found User ", user);

        if (isEmpty(user) || user?.role === "superadmin") {
          return res
            .status(404)
            .json({ error: responses.errors[language].userNotFound });
        }

        const otpResult = await generateOTP(user._id, phone, source);
        console.log("OTP Result ", otpResult);

        if (otpResult.status === "success") {
          return res.json({
            message: responses.messages[language].otpSent,
            OTP: otpResult.OTP,
          });
        } else {
          return res
            .status(500)
            .json({ error: responses.errors[language].otpGenerationError });
        }
      } catch (error) {
        console.error("Error generating OTP:", error);
        return res
          .status(500)
          .json({ error: responses.errors[language].otpGenerationError });
      }
    } else if (source === "web") {
      const user = await User.findOne({ phone: phone });

      if (!user) {
        return res
          .status(404)
          .json({ error: responses.errors[language].userNotFound });
      }

      if (!password) {
        return res
          .status(401)
          .json({ error: responses.errors[language].passwordRequired });
      }

      if (user.role !== "superadmin" && user.role !== "accountant") {
        return res
          .status(401)
          .json({ error: responses.errors[language].invalidRole });
      }

      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        return res
          .status(401)
          .json({ error: responses.errors[language].invalidCredentials });
      }
      const otpResult = await generateOTP(user._id, phone, source);

      // const token = jwt.sign(
      //   { role: "superadmin", userId: user._id, source: "web" },
      //   process.env.JWT_SECRET,
      //   { expiresIn: "24h" }
      // );

      // res.cookie("token", token, {
      //   httpOnly: true,
      //   secure: process.env.SECURE_COOKIE === "true",
      //   sameSite: process.env.SAME_SITE,
      //   maxAge: 24 * 60 * 60 * 1000,
      // });

      user.password = undefined; // Remove password from response
      return res.json({
        result: {},
        message: responses.messages[language].otpSent,
      });
    } else {
      return res
        .status(400)
        .json({ error: responses.errors[language].invalidClientSource });
    }
  } catch (err) {
    console.error("Error during login:", err);
    return res.status(500).json({
      message: responses.messages[language].internalServerError,
      error: err.message,
    });
  }
};

export const validateOTP = async (req, res) => {
  const { phone, OTP } = req.body;
  const source = req.headers["x-client-source"]; // This will not be required as this can only be called for app.

  try {
    if (isEmpty(source) || (source != "app" && source != "web")) {
      return res
        .status(404)
        .json({ error: "Invalid source." });
    }

    const newUser = await User.findOne({ phone: phone });
    // console.log("new User ", newUser);

    if (isEmpty(newUser)) {
      return res
        .status(404)
        .json({ error: "User not found. Please register." });
    }

    const getOTPDetails = await Otp.findOne({ phoneNumber: phone });
    // console.log("getOTPDetails ", getOTPDetails);

    if (isEmpty(getOTPDetails)) {
      return res
        .status(404)
        .json({ error: "No OTP found. Please generate new one." });
    }

    // Check if OTP is expired (more than 5 minutes old)
    if (new Date().getTime() > new Date(getOTPDetails.expires_on).getTime()) {
      await Otp.deleteOne({ phoneNumber: phone });
      return res
        .status(404)
        .json({ error: "OTP expired please generate new one." });
    }

    console.log(OTP, getOTPDetails.OTP, OTP == getOTPDetails.OTP);
    if (OTP == getOTPDetails.OTP) {
      await Otp.deleteOne({ phoneNumber: phone });

      if (source === "web") {

        const token = jwt.sign(
          { role: "superadmin", userId: getOTPDetails.userID, source: "web" },
          process.env.JWT_SECRET,
          { expiresIn: "24h" }
        );

        res.cookie("token", token, {
          httpOnly: true,
          secure: process.env.SECURE_COOKIE === "true",
          sameSite: process.env.SAME_SITE,
          maxAge: 24 * 60 * 60 * 1000,
        });

        return res.json({
          result: newUser,
          message: "Login sucessful.",
        });

      }
      else if (source == "app") {
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
          code: newUser?.code,
          supervisorCode: newUser?.supervisorCode,
        });
      }
      else {
        return res.status(200).json({
          message: "OTP validated successfully.",
          token,
          name: newUser.name,
          role: newUser.role,
          userId: newUser._id,
          code: newUser?.code,
          supervisorCode: newUser?.supervisorCode,
        });
      }
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
        message: `${getOTPDetails?.attempts
          ? "Wrong OTP try again. Attempts left " + getOTPDetails?.attempts
          : "Maximum attempts reached generate new OTP."
          }`,
        attempts: getOTPDetails?.attempts,
      });
    }
  } catch (error) {
    console.error("Error validating the OTP", error);
    return res.status(500).json({ error: "Error validating the OTP." });
  }
};

// Function to get all users with pagination and filtering
export const getUsers = async (req, res) => {
  const { page = 1, pageSize = 10, filter, role } = req.query;
  const query = {};
  const language = getLanguage(req, responses);

  // Apply general filter to multiple fields if filter is not empty
  const orConditions = [];

  if (!isEmpty(filter)) {
    orConditions.push(
      { name: { $regex: filter.trim(), $options: "i" } },
      { phone: { $regex: filter.trim(), $options: "i" } },
      { code: { $regex: filter.trim(), $options: "i" } },
      { supervisorCode: { $regex: filter.trim(), $options: "i" } }
    );
  }

  // Apply a specific role filter if role is not empty
  const roleCondition = !isEmpty(role)
    ? { role: { $regex: role.trim(), $options: "i" } }
    : null;

  // Construct the query with $and if both filter and role are provided
  if (orConditions.length > 0 || roleCondition) {
    query.$and = [];

    if (orConditions.length > 0) {
      query.$and.push({ $or: orConditions });
    }

    if (roleCondition) {
      query.$and.push(roleCondition);
    }
  }

  try {
    // Count total documents matching the query
    const totalCount = await User.countDocuments(query);
    const totalPages = Math.ceil(totalCount / pageSize);

    // Return 404 if no users found
    if (totalCount === 0) {
      return res
        .status(404)
        .json({ error: responses.errors[language].noUsersFound });
    }

    if (page > totalPages) {
      return res.status(400).json({
        error: responses.errors[language].pageExceeded,
      });
    }

    // Find users based on the query, select specific fields, and apply pagination
    const users = await User.find(query)
      .select("name code phone role supervisorCode shiftId isOnline siteId")
      .populate("shiftId siteId")
      .sort({ createdAt: -1 })
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
    return res.status(200).json({
      message: responses.messages[language].usersList,
      result: response,
    });
  } catch (err) {
    // Handle errors and return status 500 with error message
    return res.status(500).json({ error: err.message });
  }
};

// Get a single user by ID
export const getUserById = async (req, res) => {
  const { phone } = req.params;
  console.log("Phone ", phone);
  const language = getLanguage(req, responses);
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
      return res.status(404).json({
        error: responses.errors[language].noUsersFound,
      });
    }
    return res.status(200).json({
      message: responses.messages[language].userFound,
      result: user,
    });
  } catch (err) {
    return res.status(500).json({
      error: responses.errors[language].internalServerError,
      details: err.message,
    });
  }
};

// GEt user status
export const getUserStatus = async (req, res) => {
  const UserId = req.headers.userid;
  const language = getLanguage(req, responses);
  try {
    const user = await User.findById(UserId, {
      name: 1,
      isOnline: 1,
      role: 1,
      phone: 1,
    }).populate('shiftId').populate({ path: 'siteId', select: "name _id" });

    if (isEmpty(user)) {
      return res.status(404).json({
        error: responses.errors[language].noUsersFound,
      });
    }

    return res.status(200).json({
      message: responses.messages[language].userDetailsFetched,
      result: user,
    });
  } catch (err) {
    return res.status(500).json({
      error: responses.errors[language].internalServerError,
      details: err.message,
    });
  }
};

// Update a user
export const updateUser = async (req, res) => {
  const { id } = req.params;
  const { name, supervisorCode, shiftId, siteId } = req.body;
  console.log({ siteId });

  const language = getLanguage(req, responses);
  try {
    const userAvailable = await User.findById(id);

    if (isEmpty(userAvailable)) {
      return res.status(404).json({
        error: responses.errors[language].noUsersFound,
      });
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
    if (!isEmpty(siteId)) {
      updateDetails.siteId = siteId;
    }
    console.log({ updateDetails });

    const updatedUser = await User.findByIdAndUpdate(id, updateDetails, { new: true });

    return res.status(200).json({
      message: responses.messages[language].userUpdatedSuccessfully,
      result: updatedUser,
    });
  } catch (err) {
    return res.status(500).json({
      error: responses.errors[language].internalServerError,
      details: err.message,
    });
  }
};

// --------------- For now thsese two routes are not being used.

// Delete a user
export const deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    const deletedUser = await User.findByIdAndDelete(id);
    if (!deletedUser) {
      return res.status(404).json({ error: "User not found" });
    }
    return res.json({ message: "User deleted successfully" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

export const getSupervisorWithAssitant = async (req, res) => {
  try {
    const supervisors = await User.find(
      { role: "supervisor" },
      "name code"
    ).lean();

    const supervisorCodes = supervisors.map((s) => s.code);
    const assistants = await User.find(
      { supervisorCode: { $in: supervisorCodes }, role: "assistant" },
      "name supervisorCode"
    ).lean();

    const supervisorMap = supervisors.map((supervisor) => ({
      ...supervisor,
      assistants: assistants.filter(
        (assistant) => assistant.supervisorCode === supervisor.code
      ),
    }));

    res.json({ result: supervisorMap });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to fetch supervisors and assistants" });
  }
};

// Forgot Password.
export const forgotPassword = async (req, res) => {
  const { phone } = req.params;

  try {
    const findUser = await User.findOne({ phone });
    if (!findUser) {
      return res.status(404).json({ error: "User not found" });
    }
    console.log("role ",findUser.role)
    console.log(findUser.role != "accountant", findUser.role != "superadmin", "  ", findUser.role != "accountant" && findUser.role != "superadmin");


    if (findUser.role != "accountant" && findUser.role != "superadmin") {
      return res.status(404).json({ message: "Not allowed to reset passowrd." });
    }

    const otpSent = await generateOTP(findUser._id, findUser.phone);

    return res.status(200).json({ message: "OTP generated successfully." });

  } catch (error) {
    console.error("Error generating otp for reset password.", error);
    return res.status(500).json({ error: err.message });
  }
};

export const updateUserPassword = async (req,res) => {
  const { password, confirmPassword, OTP, phone } = req.body;

  try {
    const findUser = await User.findOne({ phone });
    if (!findUser) {
      return res.status(404).json({ error: "User not found" });
    }

    if (isEmpty(password) || isEmpty(confirmPassword) || password != confirmPassword) {
      return res.status(404).json({ message: "Please check the password and try again." });
    }
    console.log( findUser.role != "accountant", findUser.role != "superadmin","  ",findUser.role != "accountant" && findUser.role != "superadmin");

    if (findUser.role != "accountant" && findUser.role != "superadmin") {
      return res.status(404).json({ message: "Not allowed to reset passowrd." });
    }

    // const otpSent = await generateOTP(findUser._id, findUser.phone);
    const getOTPDetails = await Otp.findOne({ phoneNumber:phone });
    // console.log("getOTPDetails ", getOTPDetails);

    if (isEmpty(getOTPDetails)) {
      return res
        .status(404)
        .json({ error: "No OTP found. Please generate new one." });
    }

    // Check if OTP is expired (more than 5 minutes old)
    if (new Date().getTime() > new Date(getOTPDetails.expires_on).getTime()) {
      await Otp.findByIdAndDelete(getOTPDetails._id);
      return res
        .status(404)
        .json({ error: "OTP expired please generate new one." });
    }

    console.log(OTP, getOTPDetails.OTP, OTP == getOTPDetails.OTP);
    if (OTP == getOTPDetails.OTP) {
      await Otp.findByIdAndDelete(getOTPDetails._id);
      const hashedPassword = await bcrypt.hash(password, 10);
      await User.findByIdAndUpdate(findUser._id,
        {
          password: hashedPassword
        });

      return res.status(200).json({ message: "Password Updated Successfully." });
    }
    else {
      if (!getOTPDetails?.attempts) {
        await Otp.findByIdAndDelete(getOTPDetails._id);
      } else {
        await Otp.findByIdAndUpdate(
          getOTPDetails._id, { attempts: getOTPDetails?.attempts - 1 }
        );
      }
      return res.status(300).json({
        message: `${getOTPDetails?.attempts
          ? "Wrong OTP try again. Attempts left " + getOTPDetails?.attempts
          : "Maximum attempts reached generate new OTP."
          }`,
        attempts: getOTPDetails?.attempts,
      });
    }

  } catch (error) {
    console.error("Error updating the password.", error);

    return res.status(500).json({ error: err.message });
  }
}