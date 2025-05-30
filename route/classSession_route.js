const express = require('express');
const route = express.Router();
const auth = require('../middlewares/auth.middleware.js');
const classSessionController = require('../controller/classSession_controller.js');

route.post('/add', auth, classSessionController.addClassSession);
route.get('/findByUser/:userId', auth, classSessionController.findByUserId);
route.patch('/update/:id', auth, classSessionController.updateClassSession);
route.delete('/delete/:id', auth, classSessionController.deleteClassSession);
route.get('/findBySubject/:subjectId', auth, classSessionController.findBySubjectId);

module.exports = route; 