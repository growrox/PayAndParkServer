import multer from "multer";
import path from "path";
import fs from "fs";
// Set up the storage engine
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Access the folderName parameter from the URL
    const folderName = req.params.folderName;
    const uploadPath = path.join("images", folderName);

    // Ensure the directory structure exists, you might need to create it if it does not exist
    // Here using `fs` to ensure directory exists
    fs.mkdirSync(uploadPath, { recursive: true });

    cb(null, uploadPath); // Set the new path
  },
  filename: function (req, file, cb) {
    // Create a unique name for the file using the current timestamp
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

// File filter can be customized based on the requirement
const fileFilter = (req, file, cb) => {
  console.log("Form DAta is ",req.body);
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
