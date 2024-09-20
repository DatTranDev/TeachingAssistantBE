const CAttend = require('../model/cAttend.js');
const helper = require('../pkg/helper/helper.js');
const User = require('../model/user.js');
const Subject = require('../model/subject.js');
const UserSubject = require('../model/userSubject.js');
const ClassSession = require('../model/classSession.js');

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
module.exports = {
    addCAttend,
    findBySubjectId
}