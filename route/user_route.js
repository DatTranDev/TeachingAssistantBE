const userController = require('../controller/user_controller.js');
const auth = require('../middlewares/auth.middleware.js');
const express = require('express');
const route = express.Router();

route.post('/register', userController.register);
route.patch('/changepassword', userController.changePassword);
route.post('/login', userController.login);
route.patch('/update/:id', auth, userController.updateUser);

module.exports = route;