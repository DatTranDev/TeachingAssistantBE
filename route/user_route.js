const userController = require('../controller/user_controller.js');
const auth = require('../pkg/auth/authentication.js');
const express = require('express');
const route = express.Router();

route.post('/register', userController.regegister);
route.patch('/changepassword', userController.changePassword);
route.post('/login', userController.login);
route.patch('/update/:id', auth.authenticateToken, userController.updateUser);

module.exports = route;