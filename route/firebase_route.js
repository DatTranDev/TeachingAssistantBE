const express = require("express")
const route = express.Router()
const firebaseController = require("../controller/firebase_controller.js")
const auth = require('../middlewares/auth.middleware.js');


route.post("/subscribeToTopics", auth, firebaseController.subscribeToTopic);
route.post("/unsubscribeFromTopics", firebaseController.unsubscribeFromTopics);
module.exports = route;                                                                             