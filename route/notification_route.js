const express = require("express")
const route = express.Router()
const notificationController = require("../controller/notification_controller.js")
const auth = require('../middlewares/auth.middleware.js');

route.get("/get", auth, notificationController.getNotification);
route.patch("/read/:id", auth, notificationController.readNotification);
route.patch("/readAll", auth, notificationController.readAllNotification);
route.delete("/delete/:id", auth, notificationController.deleteNotification);

route.get("/classReschedule/:id", auth, notificationController.getClassRescheduleNoti);
route.get("/classCancel/:id", auth, notificationController.getClassCancelNoti);
module.exports = route;