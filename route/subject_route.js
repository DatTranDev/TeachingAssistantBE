const express = require('express');
const route = express.Router();
const subjectController = require('../controller/subject_controller.js');
const attendRecordController = require('../controller/attendRecord_controller.js');
const reviewController = require('../controller/review_controller.js');
const fileGenerateController = require('../controller/fileGenerate_controller.js');
const auth = require('../pkg/auth/authentication.js');

route.post('/add',auth.authenticateToken, subjectController.addSubject);
route.post('/join',auth.authenticateToken, subjectController.joinSubject);
route.post('/leave',auth.authenticateToken, subjectController.leaveSubject);

route.patch('/update/:id',auth.authenticateToken, subjectController.updateSubject);
route.delete('/delete/:id',auth.authenticateToken, subjectController.deleteSubject);

route.get('/:id', subjectController.findSubjectById);
route.get('/findByUserId/:userId',auth.authenticateToken, subjectController.findByUserId);
route.get('/avgReview/:subjectId',subjectController.getAvgRating);
route.get('/:subjectId/user/:userId/attendRecords', attendRecordController.findByUserAndSubject);
route.get('/:subjectId/user/:userId/reviews', reviewController.findBySubjectAndUser);
route.get('/:subjectId/students', subjectController.getStudents);
route.get('/:subjectId/students/exportExcel', fileGenerateController.getStudentList);
module.exports = route;