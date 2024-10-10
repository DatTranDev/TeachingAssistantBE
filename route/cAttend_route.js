const express = require('express');
const route = express.Router();
const cAttendController = require('../controller/cAttend_controller.js');
const attendRecordController = require('../controller/attendRecord_controller.js');
const auth = require('../pkg/auth/authentication.js');

route.post('/add', auth.authenticateToken, cAttendController.addCAttend);
route.get('/findBySubject/:subjectId', cAttendController.findBySubjectId);
route.post('/attendRecord/add', auth.authenticateToken, attendRecordController.addAttendRecord);
module.exports = route;
