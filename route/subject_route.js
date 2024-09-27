const express = require('express');
const route = express.Router();
const subjectController = require('../controller/subject_controller.js');

route.post('/add', subjectController.addSubject);
route.post('/join', subjectController.joinSubject);
route.patch('/update/:id', subjectController.updateSubject);
route.delete('/delete/:id', subjectController.deleteSubject);

module.exports = route;