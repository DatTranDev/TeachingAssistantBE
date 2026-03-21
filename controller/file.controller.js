const File = require("../model/file.js");
const FirebaseService = require("../services/firebase.service.js");
const { BadRequestError, NotFoundError } = require("../utils/AppError.js");
const { checkUsage, consumeUsage } = require("../services/billing.service");

const uploadFile = async (req, res, next) => {
  let uploadedPath = null;
  try {
    const file = req.file;
    if (!file) throw new BadRequestError("No file in the request");

    const userId = req.auth.userId;
    const authorizationHeader = req.headers?.authorization;

    // Billing Check (Storage)
    const isAllowed = await checkUsage(
      userId,
      "storage",
      file.size,
      authorizationHeader,
    );
    if (!isAllowed) {
      throw new BadRequestError(
        "Insufficient storage quota. Please upgrade your plan.",
      );
    }

    const fileName = req.body.name || file.originalname;

    // Upload to Firebase
    const { url, path } = await FirebaseService.getURL(file);
    uploadedPath = path;

    await consumeUsage(
      userId,
      "storage",
      file.size,
      authorizationHeader,
      "file upload",
    );

    const newFile = new File({
      userId: userId,
      name: fileName,
      size: file.size,
      url: url,
      type: file.mimetype,
      firebasePath: path,
    });

    await newFile.save();

    return res.status(201).json({
      message: "File uploaded successfully",
      file: newFile,
    });
  } catch (err) {
    if (uploadedPath) {
      try {
        await FirebaseService.deleteFromStorage(uploadedPath);
      } catch (cleanupErr) {
        console.error("[File Upload Rollback Error]", cleanupErr);
      }
    }
    next(err);
  }
};

const getUserFiles = async (req, res, next) => {
  try {
    const userId = req.auth.userId;
    const files = await File.find({ userId }).sort({ createdAt: -1 });
    return res.json(files);
  } catch (err) {
    next(err);
  }
};

const deleteFile = async (req, res, next) => {
  try {
    const userId = req.auth.userId;
    const fileId = req.params.id;

    const file = await File.findOne({ _id: fileId, userId });
    if (!file) {
      throw new NotFoundError("File not found or unauthorized");
    }

    // Delete from Firebase
    await FirebaseService.deleteFromStorage(file.firebasePath);

    // Delete from DB
    await File.findByIdAndDelete(fileId);

    return res.json({ message: "File deleted successfully" });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  uploadFile,
  getUserFiles,
  deleteFile,
};
