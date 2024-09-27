const express = require('express');
const route = express.Router();
const cAttendController = require('../controller/cAttend_controller.js');
const attendRecordController = require('../controller/attendRecord_controller.js');

route.post('/add', cAttendController.addCAttend);
route.get('/findBySubject/:subjectId', cAttendController.findBySubjectId);
route.post('/attendRecord/add', attendRecordController.addAttendRecord);
module.exports = route;
