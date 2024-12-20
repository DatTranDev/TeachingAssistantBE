const CAttend = require('../model/cAttend.js');
const helper = require('../pkg/helper/helper.js');
const User = require('../model/user.js');
const Subject = require('../model/subject.js');
const UserSubject = require('../model/userSubject.js');
const ClassSession = require('../model/classSession.js');
const Review = require('../model/review.js');
const AttendRecord = require('../model/attendRecord.js');
const Document = require('../model/document.js');

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
    await newCAttend.save()
        .then(async (cAttend) => {
            const subject = await Subject.findById(existClassSession.subjectId);
            if (subject) {
                subject.currentSession += 1;
                await subject.save();
            }

            return res.status(201).json({
                cAttend: cAttend
            });
        })
        .catch(err => {
            return res.status(500).json({
                message: "Internal server error: " + err
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
const deleteCAttend = async(req, res)=>{
    const cAttendId = req.params.cAttendId;
    const isValidId = await helper.isValidObjectID(cAttendId);
    if(!isValidId){
        return res.status(400).json({
            message: "Invalid object id"
        })
    }
    const cAttend = await CAttend.findOne({
        _id: cAttendId
    });
    if(!cAttend){
        return res.status(404).json({
            message: "CAttend is not found"
        });
    }
    const userIdFromToken = req.user.userId;
    const userSubject = await UserSubject
    .findOne({
        userId: userIdFromToken,
        subjectId: cAttend.subjectId,
        role: "teacher"
    });
    if(!userSubject){
        return res.status(404).json({
            message: "User is not a teacher of the subject"
        });
    }
    //Delete all object references to this cAttend
    await AttendRecord.deleteMany({
        cAttendId: cAttendId
    }).catch(
        err=>{
            return res.status(500).json({
                message: "Internal server error: "+err
            });
        });
    await Review.deleteMany({
        cAttendId: cAttendId
    }).catch(
        err=>{
            return res.status(500).json({
                message: "Internal server error: "+err
            });
        });    
    await Document.deleteMany({
        cAttendId: cAttendId
    }).catch(
        err=>{
            return res.status(500).json({
                message: "Internal server error: "+err
            });
        });
    await CAttend.deleteOne({ _id: req.params.cAttendId })
    .then(async () => {
        // Decrease the currentSession of the subject
        const subject = await Subject.findById(userSubject.subjectId);
        if (subject) {
            subject.currentSession -= 1;
            await subject.save();
        }
        //Decrease the session number of other cAttends
        const cAttends = await CAttend.find({
            classSessionId: cAttend.classSessionId
        });
        await Promise.all(cAttends.map(async (cAttend) => {
            if (cAttend.sessionNumber > cAttend.sessionNumber) {
                cAttend.sessionNumber -= 1;
                await cAttend.save();
            }
        }));


        return res.status(200).json({
            message: "CAttend deleted successfully"
        });
    })
    .catch(err => {
        return res.status(500).json({
            message: "Internal server error: " + err
        });
    });
}
const getAttendStudent = async(req, res)=>{
    const isValidId = await helper.isValidObjectID(req.params.cAttendId);
    if(!isValidId){
        return res.status(400).json({
            message: "Invalid cAttend id"
        });
    }
    const existCAttend = await CAttend.findOne({
        _id: req.params.cAttendId
    });
    if(!existCAttend){
        return res.status(404).json({
            message: "CAttend is not found"
        });
    }
    const attendRecords = await AttendRecord.find({
        cAttendId: req.params.cAttendId
    }).populate({
        path: 'studentId',
        select: '-password'
    });
    const students = attendRecords.map((attendRecord)=>{
        return attendRecord.studentId;
    });
    return res.status(200).json({
        students: students
    });
}
const findById = async(req, res)=>{
    const isValidId = await helper.isValidObjectID(req.params.id);
    if(!isValidId){
        return res.status(400).json({
            message: "Invalid cAttend id"
        });
    }
    const cAttend = await CAttend.findOne({
        _id: req.params.id
    });
    if(!cAttend){
        return res.status(404).json({
            message: "CAttend is not found"
        });
    }
    return res.status(200).json({
        cAttend: cAttend
    });
}
module.exports = {
    addCAttend,
    findBySubjectId,
    updateCAttend,
    deleteCAttend,
    getAttendStudent,
    findById
}