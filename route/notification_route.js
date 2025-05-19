const express = require("express")
const route = express.Router()
const notificationController = require("../controller/notification_controller.js")
const auth = require('../pkg/auth/authentication.js');

route.get("/get", auth.authenticateToken, notificationController.getNotification);
route.patch("/read/:id", auth.authenticateToken, notificationController.readNotification);
route.patch("/readAll", auth.authenticateToken, notificationController.readAllNotification);
route.delete("/delete/:id", auth.authenticateToken, notificationController.deleteNotification);

route.get("/classCancel/:id", auth.authenticateToken, notificationController.getClassCancelNoti);
module.exports = route;