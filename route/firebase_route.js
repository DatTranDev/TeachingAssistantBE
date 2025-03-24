const express = require("express")
const route = express.Router()
const firebaseController = require("../controller/firebase_controller.js")
const auth = require('../pkg/auth/authentication.js');


route.post("/subscribeToTopics", auth.authenticateToken, firebaseController.subscribeToTopic);
route.post("/unsubscribeFromTopics", firebaseController.unsubscribeFromTopics);
module.exports = route;                                                                             