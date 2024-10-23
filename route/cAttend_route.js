const express = require('express');
const route = express.Router();
const cAttendController = require('../controller/cAttend_controller.js');
const attendRecordController = require('../controller/attendRecord_controller.js');
const auth = require('../pkg/auth/authentication.js');

route.post('/add', auth.authenticateToken, cAttendController.addCAttend);
route.get('/findBySubject/:subjectId',auth.authenticateToken, cAttendController.findBySubjectId);
route.patch('/update/:id', auth.authenticateToken, cAttendController.updateCAttend);
route.delete('/delete/:cAttendId', auth.authenticateToken, cAttendController.deleteCAttend);
route.post('/attendRecord/add', auth.authenticateToken, attendRecordController.addAttendRecord);
module.exports = route;
