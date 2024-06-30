// const multer = require("multer");
// const path = require("path");
import multer from "multer";

// Set up the storage engine
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "images/"); // Path where the uploaded files will be stored
  },
  filename: function (req, file, cb) {
    // Create a unique name for the file using the current timestamp
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

// File filter can be customized based on the requirement
const fileFilter = (req, file, cb) => {
  if (file.mimetype === "image/jpeg" || file.mimetype === "image/png") {
    cb(null, true); // Accept file
  } else {
    cb(new Error("Unsupported file type"), false); // Reject file
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 1024 * 1024 * 1, // 1 MB file size limit
  },
});
export default upload;
