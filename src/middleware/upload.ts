import fs from "fs";
import multer from "multer";
import path from "path";

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});

// Middleware to modify file path to be relative before storing in database
export const processUploadedFiles = (req: any, res: any, next: any) => {
  if (!req.files) return next();

  // Process each file to replace absolute path with relative path
  Object.keys(req.files).forEach((fieldname) => {
    req.files[fieldname].forEach((file: any) => {
      // Convert absolute path to relative path
      // Original path: /Users/chiragjani/Documents/free/givetoafrica/server/uploads/mainImage-123456.jpg
      // New path: /uploads/mainImage-123456.jpg
      const relativePath = "/uploads/" + path.basename(file.path);
      file.path = relativePath;
    });
  });

  next();
};

// Middleware to modify a single file's path to be relative before storing in database
export const processSingleUploadedFile = (req: any, res: any, next: any) => {
  if (!req.file) return next();

  // Convert absolute path to relative path
  // Original path: /Users/chiragjani/Documents/free/givetoafrica/server/uploads/profileImage-123456.jpg
  // New path: /uploads/profileImage-123456.jpg
  const relativePath = "/uploads/" + path.basename(req.file.path);
  req.file.path = relativePath;

  next();
};

// File filter
const fileFilter = (
  req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  // Accept pdf, doc, docx, jpg, png files
  const allowedTypes = [".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png"];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid file type. Only PDF, DOC, DOCX, JPG, JPEG, and PNG files are allowed."
      )
    );
  }
};

// Export upload middleware
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});
