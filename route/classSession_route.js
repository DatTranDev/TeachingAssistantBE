const express = require('express');
const route = express.Router();
const classSessionController = require('../controller/classSession_controller.js');

route.post('/add', classSessionController.addClassSession);
route.get('/findByUser/:userId', classSessionController.findByUserId);
route.patch('/update/:id', classSessionController.updateClassSession);
route.delete('/delete/:id', classSessionController.deleteClassSession);

module.exports = route; 