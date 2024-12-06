const Question = require('../model/question.js');
const Subject = require('../model/subject.js');
const User = require('../model/user.js');
const helper = require('../pkg/helper/helper.js');
const tokenController = require('./token_controller.js');
const UserSubject = require('../model/userSubject.js');

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
    if(!isValidId2){
        return res.status(400).json({
            message: "Invalid student id"
        });
    }
    const existUser = await User.findOne({
        _id: req.body.studentId
    });
    if(!existUser){
        return res.status(404).json({
            message: "User is not found"
        });
    }
    const userIdFromToken = req.user.userId;
    if(userIdFromToken != req.body.studentId){
        await tokenController.deleteTokenByUserID(userIdFromToken);
        return res.status(403).json({
            message: "Unauthorized action"
        });
    }
    const userSubject = await UserSubject.findOne({
        userId: req.body.studentId,
        subjectId: req.body.subjectId
    });
    if(!userSubject){
        return res.status(404).json({
            message: "User is not in the subject"
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
    const userIdFromToken = req.user.userId;
    const userSubject = await UserSubject.findOne({
        userId: userIdFromToken,
        subjectId: existQuestion.subjectId,
        role: "teacher"
    });
    if(!userSubject){
        return res.status(403).json({
            message: "Unauthorized action"
        });
    }
    const status = req.body.isResolved;

    await Question.findByIdAndUpdate(req.params.id, {isResolved: status}).then((question)=>{
        return res.status(200).json({
            message: "Question is updated successfully",
            question: question
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
    const userIdFromToken = req.user.userId;
    const userSubject = await UserSubject.findOne({
        userId: userIdFromToken,
        subjectId: existQuestion.subjectId
    });
    if(!userSubject){
        return res.status(403).json({
            message: "Unauthorized action"
        });
    }
    if(userSubject.role == "student" && userIdFromToken != existQuestion.studentId){
        await tokenController.deleteTokenByUserID(userIdFromToken);
        return res.status(403).json({
            message: "Unauthorized action"
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
    const userIdFromToken = req.user.userId;
    const userSubject = await UserSubject.findOne({
        userId: userIdFromToken,
        subjectId: existSubject._id
    });
    if(!userSubject){
        return res.status(403).json({
            message: "Unauthorized action"
        });
    }
    //Pagination with limit and page if exist
    const limit = parseInt(req.query.limit);
    const page = parseInt(req.query.page);
    if(!limit || !page){
        const questions = await Question.find({
            subjectId: req.params.subjectId
        });
        return res.status(200).json({
            questions: questions
        });
    }
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const results = {};
    if(endIndex < await Question.countDocuments({subjectId: req.params.subjectId}).exec()){
        results.next = {
            page: page + 1,
            limit: limit
        };
    }
    if(startIndex > 0){
        results.previous = {
            page: page - 1,
            limit: limit
        };
    }
    try{
        results.questions = await Question.find({subjectId: req.params.subjectId}).
        populate({
            path: 'studentId',
            select: '-password'
        }).limit(limit).skip(startIndex).exec();
        return res.status(200).json(results);
    } catch(err){
        return res.status(500).json({
            message: "Internal server error: "+err
        });
    }
}


module.exports = { 
    addQuestion, 
    updateQuestion, 
    deleteQuestion, 
    findBySubjectId 
};