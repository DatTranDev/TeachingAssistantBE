const express = require('express');
const route = express.Router();
const auth = require('../pkg/auth/authentication.js');
const classSessionController = require('../controller/classSession_controller.js');

route.post('/add', auth.authenticateToken, classSessionController.addClassSession);
route.get('/findByUser/:userId', auth.authenticateToken, classSessionController.findByUserId);
route.patch('/update/:id', auth.authenticateToken, classSessionController.updateClassSession);
route.delete('/delete/:id', auth.authenticateToken, classSessionController.deleteClassSession);

module.exports = route; 