const express = require('express');
const route = express.Router();
const emailController = require('../controller/email_controller.js');

route.post('/sendEmal', emailController.sendEmail);

module.exports = route;