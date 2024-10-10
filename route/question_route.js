const express=require('express');
const route=express.Router();
const questionController=require('../controller/question_controller.js');
const auth=require('../pkg/auth/authentication.js');

route.post('/add', auth.authenticateToken, questionController.addQuestion);
//route.patch('/update/:id', questionController.updateQuestion);
route.delete('/delete/:id', auth.authenticateToken, questionController.deleteQuestion);
route.get('/findBySubject/:subjectId', questionController.findBySubjectId);

module.exports=route;