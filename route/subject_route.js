const express = require('express');
const route = express.Router();
const subjectController = require('../controller/subject_controller.js');
const auth = require('../pkg/auth/authentication.js');

route.post('/add',auth.authenticateToken, subjectController.addSubject);
route.post('/join',auth.authenticateToken, subjectController.joinSubject);
route.patch('/update/:id',auth.authenticateToken, subjectController.updateSubject);
route.delete('/delete/:id',auth.authenticateToken, subjectController.deleteSubject);
route.get('/findByUserId/:userId',auth.authenticateToken, subjectController.findByUserId);
module.exports = route;