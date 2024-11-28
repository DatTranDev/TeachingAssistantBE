const express = require("express")
const route = express.Router()
const multer = require("multer")
const firebaseController = require("../controller/firebase_controller.js")


const uploadOptions = multer({storage: multer.memoryStorage()})

route.post("/image", uploadOptions.single("image"), firebaseController.uploadImage)
route.post("/images", uploadOptions.array("image", 5), firebaseController.uploadImages)
route.post("/file", uploadOptions.single("file"), firebaseController.uploadFile)
module.exports = route;                                                                             