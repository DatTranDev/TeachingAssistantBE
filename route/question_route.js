const express=require('express');
const route = express.Router();
const questionController = require('../controller/question_controller.js');
const auth = require('../middlewares/auth.middleware.js');

route.post('/add', auth, questionController.addQuestion);
route.patch('/update/:id', auth, questionController.updateQuestion);
route.delete('/delete/:id', auth, questionController.deleteQuestion);
route.get('/findBySubject/:subjectId',auth, questionController.findBySubjectId);

module.exports=route;