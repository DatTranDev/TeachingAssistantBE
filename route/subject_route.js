const express = require('express');
const route = express.Router();
const subjectController = require('../controller/subject_controller.js');

route.post('/add', subjectController.addSubject);
route.post('/join', subjectController.joinSubject);
route.patch('/update', subjectController.updateSubject);
route.delete('/delete', subjectController.deleteSubject);

module.exports = route;