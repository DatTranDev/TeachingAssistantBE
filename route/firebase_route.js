const express = require("express")
const route = express.Router()
const firebaseController = require("../controller/firebase_controller.js")

route.post("/subscribeToTopics", firebaseController.subscribeToTopic);
route.post("/unsubscribeFromTopic", firebaseController.unsubscribeFromTopic);
module.exports = route;                                                                             