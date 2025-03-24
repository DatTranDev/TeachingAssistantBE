const express = require('express');
const route = express.Router();
const cAttendController = require('../controller/cAttend_controller.js');
const attendRecordController = require('../controller/attendRecord_controller.js');
const auth = require('../pkg/auth/authentication.js');

route.post('/add', auth.authenticateToken, cAttendController.addCAttend);
route.get('/findBySubject/:subjectId',auth.authenticateToken, cAttendController.findBySubjectId);
route.get('/:id', cAttendController.findById);
route.patch('/update/:id', auth.authenticateToken, cAttendController.updateCAttend);
route.delete('/delete/:cAttendId', auth.authenticateToken, cAttendController.deleteCAttend);
route.post('/attendRecord/add', auth.authenticateToken, attendRecordController.addAttendRecord);
route.post('/attendRecord/add/forStudent', auth.authenticateToken, attendRecordController.addForStudent);
route.patch('/attendRecord/update/forStudent/:id', auth.authenticateToken, attendRecordController.updateForStudent);
route.patch('/attendRecord/markExcusedAttendance', auth.authenticateToken, attendRecordController.markExcusedAttendance);
route.get('/attendStudents/:cAttendId', auth.authenticateToken, cAttendController.getAttendStudent);
route.patch('/reset/:cAttendId', auth.authenticateToken, cAttendController.resetAttendance);
module.exports = route;
