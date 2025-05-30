const express = require('express');
const route = express.Router();
const auth = require('../middlewares/auth.middleware.js');
const absenceController = require('../controller/absenceRequest_controller.js');

route.post('/create', auth,absenceController.createRequest);
route.patch('/update/:id', auth,absenceController.updateRequest);
route.get('/info/:id', auth,absenceController.getAbsenceRequestInfo);
route.get('/studentRequest', auth,absenceController.getStudentAbsenceRequest);
route.get('/teacherRequest', auth,absenceController.getTeacherAbsenceRequest);
route.delete('/delete/:id', auth,absenceController.deleteRequest);

module.exports = route;