const express = require('express');
const route = express.Router();
const cAttendController = require('../controller/cAttend_controller.js');
const attendRecordController = require('../controller/attendRecord_controller.js');
const auth = require('../middlewares/auth.middleware.js');

route.post('/add', auth, cAttendController.addCAttend);
route.get('/findBySubject/:subjectId',auth, cAttendController.findBySubjectId);
route.get('/:id', cAttendController.findById);
route.patch('/update/:id', auth, cAttendController.updateCAttend);
route.delete('/delete/:cAttendId', auth, cAttendController.deleteCAttend);
route.post('/attendRecord/add', auth, attendRecordController.addAttendRecord);
route.post('/attendRecord/add/forStudent', auth, attendRecordController.addForStudent);
route.patch('/attendRecord/update/forStudent/:id', auth, attendRecordController.updateForStudent);
route.patch('/attendRecord/markExcusedAttendance', auth, attendRecordController.markExcusedAttendance);
route.get('/attendStudents/:cAttendId', auth, cAttendController.getAttendStudent);
route.patch('/reset/:cAttendId', auth, cAttendController.resetAttendance);
route.patch('/resetSingle/:cAttendId/:index', auth, cAttendController.resetSingleAttendance);
route.patch('/updateAcceptedNumber/:cAttendId', auth, cAttendController.updateAcceptedNumber);

route.get('/topParticipants/:cAttendId', auth, cAttendController.getTopParticipants);
route.get('/topReactors/:cAttendId', auth, cAttendController.getTopReactors);
module.exports = route;
