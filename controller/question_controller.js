const Question = require('../model/question.js');
const Subject = require('../model/subject.js');
const User = require('../model/user.js');

const addQuestion = async(req, res)=>{
    const isValidId = await helper.isValidObjectID(req.body.subjectId);
    if(!isValidId){
        return res.status(400).json({
            message: "Invalid subject id"
        });
    }
    const existSubject = await Subject.findOne({
        _id: req.body.subjectId
    });
    if(!existSubject){
        return res.status(404).json({
            message: "Subject is not found"
        });
    }
    const isValidId2 = await helper.isValidObjectID(req.body.studentId);
    const existUser = await User.findOne({
        _id: req.body.studentId
    });
    if(!existUser){
        return res.status(404).json({
            message: "User is not found"
        });
    }
    const newQuestion = new Question(req.body);
    await newQuestion.save().then((question)=>{
        return res.status(201).json({
            question: question
        });
    }).catch(
        err=>{
            return res.status(500).json({
                message: "Internal server error: "+err
            });
        });
}
const updateQuestion = async(req, res)=>{
    const isValidId = await helper.isValidObjectID(req.params.id);
    if(!isValidId){
        return res.status(400).json({
            message: "Invalid question id"
        });
    }
    const existQuestion = await Question.findOne({
        _id: req.params.id
    });
    if(!existQuestion){
        return res.status(404).json({
            message: "Question is not found"
        });
    }
    await Question.findByIdAndUpdate(req.params.id, req.body).then((question)=>{
        return res.status(200).json({
            message: "Question is updated successfully"
        });
    }).catch(
        err=>{
            return res.status(500).json({
                message: "Internal server error: "+err
            });
        });
}
const deleteQuestion = async(req, res)=>{
    const isValidId = await helper.isValidObjectID(req.params.id);
    if(!isValidId){
        return res.status(400).json({
            message: "Invalid question id"
        });
    }
    const existQuestion = await Question.findOne({
        _id: req.params.id
    });
    if(!existQuestion){
        return res.status(404).json({
            message: "Question is not found"
        });
    }
    await Question.findByIdAndDelete(req.params.id).then((question)=>{
        return res.status(200).json({
            message: "Question is deleted successfully"
        });
    }).catch(
        err=>{
            return res.status(500).json({
                message: "Internal server error: "+err
            });
        });
}
const findBySubjectId = async(req, res)=>{
    const isValidId = await helper.isValidObjectID(req.params.subjectId);
    if(!isValidId){
        return res.status(400).json({
            message: "Invalid subject id"
        });
    }
    const existSubject = await Subject.findOne({
        _id: req.params.subjectId
    });
    if(!existSubject){
        return res.status(404).json({
            message: "Subject is not found"
        });
    }
    const questions = await Question.find({
        subjectId: req.params.subjectId
    });
    return res.status(200).json({
        questions: questions
    });
}
module.exports = { 
    addQuestion, 
    updateQuestion, 
    deleteQuestion, 
    findBySubjectId 
};