const express = require('express');
const route = express.Router();
const auth = require('../pkg/auth/authentication.js');
const absenceController = require('../controller/absenceRequest_controller.js');

route.post('/create', auth.authenticateToken,absenceController.createRequest);
route.patch('/update/:id', auth.authenticateToken,absenceController.updateRequest);
route.get('/info/:id', auth.authenticateToken,absenceController.getAbsenceRequestInfo);
route.get('/studentRequest', auth.authenticateToken,absenceController.getStudentAbsenceRequest);
route.get('/teacherRequest', auth.authenticateToken,absenceController.getTeacherAbsenceRequest);
route.delete('/delete/:id', auth.authenticateToken,absenceController.deleteRequest);

module.exports = route;