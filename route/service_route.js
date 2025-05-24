const express = require('express');
const route = express.Router();
const emailController = require('../controller/email_controller.js');

route.post('/sendEmail', emailController.sendEmail);
route.post('/verifyCode', emailController.verifyCode);
route.post('/verifyEmail', emailController.verifyEmail);

module.exports = route;