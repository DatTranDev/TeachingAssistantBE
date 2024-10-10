const express = require('express');
const route = express.Router();
const emailController = require('../controller/email_controller.js');

route.post('/sendEmail', emailController.sendEmail);

module.exports = route;