const express=require('express');
const route=express.Router();
const questionController=require('../controller/question_controller.js');

route.post('/add', questionController.addQuestion);
//route.patch('/update/:id', questionController.updateQuestion);
route.delete('/delete/:id', questionController.deleteQuestion);
route.get('/findBySubject/:subjectId', questionController.findBySubjectId);

module.exports=route;