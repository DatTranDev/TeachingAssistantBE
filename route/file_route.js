const express = require("express");
const router = express.Router();
const multer = require("multer");
const fileController = require("../controller/file.controller.js");

const upload = multer({ storage: multer.memoryStorage() });

router.post("/", upload.single("file"), fileController.uploadFile);
router.get("/", fileController.getUserFiles);
router.delete("/:id", fileController.deleteFile);

module.exports = router;
