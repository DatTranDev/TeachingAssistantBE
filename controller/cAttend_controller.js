const CAttend = require('../model/cAttend.js');
const helper = require('../pkg/helper/helper.js');
const User = require('../model/user.js');
const Subject = require('../model/subject.js');
const UserSubject = require('../model/userSubject.js');
const ClassSession = require('../model/classSession.js');
const tokenController = require('./token_controller.js');

const addCAttend = async(req, res)=>{
    const isValidId = await helper.isValidObjectID(req.body.classSessionId);
    if(!isValidId){
        return res.status(400).json({
            message: "Invalid class session id"
        });
    }
    const existClassSession = await ClassSession.findOne({
        _id: req.body.classSessionId
    });
    if(!existClassSession){
        return res.status(404).json({
            message: "Class session is not found"
        });
    }
    const userIdFromToken = req.user.userId;
    const userSubject = await UserSubject.findOne({
        userId: userIdFromToken,
        subjectId: existClassSession.subjectId,
        role: "teacher"
    });
    if(!userSubject){
        return res.status(404).json({
            message: "User is not a teacher of the subject"
        });
    }
    req.body.date = helper.parseDate(req.body.date);    
    const newCAttend = new CAttend(req.body);
    await newCAttend.save().then((cAttend)=>{
        return res.status(201).json({
            cAttend: cAttend
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
        subjectId: req.params.subjectId
    });
    if(!userSubject){
        return res.status(404).json({
            message: "User is not a teacher or student of the subject"
        });
    }
    const classSessions = await ClassSession.find({
        subjectId: req.params.subjectId
    });
    const classSessionIds = classSessions.map((classSession)=>{
        return classSession._id;
    });
    const cAttends = await CAttend.find({
        classSessionId: {
            $in: classSessionIds
        }
    });
    return res.status(200).json({
        cAttends: cAttends
    });

}
const updateCAttend = async(req, res)=>{
    const isValidId = await helper.isValidObjectID(req.params.id);
    if(!isValidId){
        return res.status(400).json({
            message: "Invalid cAttend id"
        });
    }
    const existCAttend = await CAttend.findOne({
        _id: req.params.id
    });
    if(!existCAttend){
        return res.status(404).json({
            message: "CAttend is not found"
        });
    }
    const cs = await ClassSession.findOne({
        _id: existCAttend.classSessionId
    });
    
    const userIdFromToken = req.user.userId;
    const userSubject = await UserSubject.findOne({
        userId: userIdFromToken,
        subjectId: cs.subjectId,
        role: "teacher"
    });
    if(!userSubject){
        return res.status(404).json({
            message: "User is not a teacher of the subject"
        });
    }
    await CAttend.updateOne({
        _id: req.params.id
    }, req.body).then(()=>{
        return res.status(200).json({
            message: "CAttend is updated"
        });
    }).catch(
        err=>{
            return res.status(500).json({
                message: "Internal server error: "+err
            });
        });
}
module.exports = {
    addCAttend,
    findBySubjectId,
    updateCAttend
}