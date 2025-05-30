const express = require('express');
const route = express.Router();
const subjectController = require('../controller/subject_controller.js');
const attendRecordController = require('../controller/attendRecord_controller.js');
const reviewController = require('../controller/review_controller.js');
const fileGenerateController = require('../controller/fileGenerate_controller.js');
const auth = require('../middlewares/auth.middleware.js');

route.post('/add',auth, subjectController.addSubject);
route.post('/join',auth, subjectController.joinSubject);
route.post('/leave',auth, subjectController.leaveSubject);

route.patch('/update/:id',auth, subjectController.updateSubject);
route.delete('/delete/:id',auth, subjectController.deleteSubject);

route.get('/:id', subjectController.findSubjectById);
route.get('/findByUserId/:userId',auth, subjectController.findByUserId);
route.get('/avgReview/:subjectId',subjectController.getAvgRating);
route.get('/:subjectId/user/:userId/attendRecords', attendRecordController.findByUserAndSubject);
route.get('/:subjectId/user/:userId/reviews', reviewController.findBySubjectAndUser);
route.get('/:subjectId/students', subjectController.getStudents);
route.get('/:subjectId/students/exportExcel', fileGenerateController.getStudentList);

route.post('/notify/classCancel',auth, subjectController.notifyClassCancellation);
route.post('/notify/classReschedule',auth, subjectController.notifyClassReschedule);
module.exports = route;