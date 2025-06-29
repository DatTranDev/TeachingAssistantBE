const AbsenceRequest = require('../model/absenceRequest.js');
const User = require('../model/user.js');
const Subject = require('../model/subject.js');
const AttendRecord = require('../model/attendRecord.js');
const CAttend = require('../model/cAttend.js');
const Notification = require('../model/notification.js');
const NotificationRecipient = require('../model/notificationRecipient.js');

const NotificationController = require('./notification_controller.js');
const helper = require('../utils/helper.js');

const createRequest = async (req, res) => {
    const isValidId = await helper.isValidObjectID(req.body.studentId);
    const isValidId2 = await helper.isValidObjectID(req.body.subjectId);
    if (!isValidId || !isValidId2) {
        return res.status(400).json({
            message: "Invalid id"
        });
    }
    const existStudent = await User.findById(req.body.studentId);
    if (!existStudent) {
        return res.status(404).json({
            message: "Student is not found"
        });
    }
    const existSubject = await Subject.findById(req.body.subjectId);
    if (!existSubject) {
        return res.status(404).json({
            message: "Subject is not found"
        });
    }
    const userIdFromToken = req.user.userId;
    if (userIdFromToken != req.body.studentId) {
        return res.status(403).json({
            message: "Unauthorized action"
        });
    }
    const absenceRequest = new AbsenceRequest({
        studentId: req.body.studentId,
        subjectId: req.body.subjectId,
        proof: req.body.proof,
        date: helper.parseDate(req.body.date),
        reason: req.body.reason,
        status: 'pending',
        reviewedBy: null,
        reviewedAt: null
    });
    await absenceRequest.save().then(async(absenceRequest) => {
        await NotificationController.FcreateNotification({
            title: "Đơn xin nghỉ học",
            content: "Sinh viên " + existStudent.name + ": " + req.body.reason,
            type: "absence_request",
            referenceModel: "AbsenceRequest",
            referenceId: absenceRequest._id
        }, [existSubject.hostId], null);
        return res.status(201).json({
            absenceRequest: absenceRequest
        });
    }).catch((err) => {
        return res.status(500).json({
            message: err.message
        });
    });
};
const updateRequest = async (req, res) => {
    const isValidId = await helper.isValidObjectID(req.params.id);
    if (!isValidId) {
        return res.status(400).json({
            message: "Invalid id"
        });
    }
    const absenceRequest = await AbsenceRequest.findById(req.params.id).populate('subjectId');
    if (!absenceRequest) {
        return res.status(404).json({
            message: "Absence request is not found"
        });
    }
    const userIdFromToken = req.user.userId;
    if(userIdFromToken != absenceRequest.subjectId.hostId){
        return res.status(403).json({
            message: "Unauthorized action"
        });
    }
    absenceRequest.status = req.body.status;
    absenceRequest.reviewedBy = userIdFromToken;
    absenceRequest.reviewedAt = new Date();
    absenceRequest.comment = req.body.comment;
    if(absenceRequest.status == 'approved'){
        const list = await CAttend.find({
            date: absenceRequest.date
        }).populate('classSessionId');
        const finded = list.find((item) => {
            return item.classSessionId && item.classSessionId.subjectId.toString() === absenceRequest.subjectId._id.toString();
        });
        if(finded) {
            const attendRecord = await AttendRecord.findOneAndUpdate(
                {
                    cAttendId: finded._id,
                    studentId: absenceRequest.studentId
                },  
                {
                    status: 'CP'
                },
                { new: true }
            );
        }
    }
       
    await absenceRequest.save().then(async(absenceRequest) => {
        const title = absenceRequest.status == 'approved' ? "Đơn xin nghỉ học đã được duyệt" : "Đơn xin nghỉ học đã bị từ chối";
        const content = absenceRequest.status == 'approved' ? `Môn ${absenceRequest.subjectId.name}, ngày ${helper.formatNoWeekday(absenceRequest.date)}` : ``;
        await NotificationController.FcreateNotification({
            title: title,
            content: content,
            type: "other",
            referenceModel: "AbsenceRequest",
            referenceId: absenceRequest._id
        }, [absenceRequest.studentId], null);
        return res.status(200).json({
            absenceRequest: absenceRequest
        });
    }).catch((err) => {
        return res.status(500).json({
            message: err.message
        });
    });
    
};

const getAbsenceRequestInfo = async (req, res) => {
    const isValidId = await helper.isValidObjectID(req.params.id);
    if (!isValidId) {
        return res.status(400).json({
            message: "Invalid id"
        });
    }
    const absenceRequest = await AbsenceRequest.findById(req.params.id).populate('studentId').populate('subjectId');
    if (!absenceRequest) {
        return res.status(404).json({
            message: "Absence request is not found"
        });
    }
    return res.status(200).json({
        absenceRequest: absenceRequest
    });
};
const getTeacherAbsenceRequest = async (req, res) => {
    const userIdFromToken = req.user.userId;
    const subjectId = req.query.subjectId;
    const absenceRequests = await AbsenceRequest.find({})
    .populate([
        { path: 'studentId', select: '-password'},
        { path: 'subjectId'}
    ]);

    const filteredRequests = absenceRequests?.filter(
        req => req.subjectId?.hostId?.toString() === userIdFromToken.toString() && 
        subjectId ? req.subjectId._id.toString() === subjectId : true
    );
    return res.status(200).json({
        absenceRequests: filteredRequests
    });
}
const getStudentAbsenceRequest = async (req, res) => {
    const userIdFromToken = req.user.userId;
    const subjectId = req.query.subjectId;
    const absenceRequests = await AbsenceRequest.find({studentId: userIdFromToken, subjectId: subjectId})
    .populate('subjectId');
    return res.status(200).json({
        absenceRequests: absenceRequests
    });
}
const deleteRequest = async (req, res) => {
    const isValidId = await helper.isValidObjectID(req.params.id);
    if (!isValidId) {
        return res.status(400).json({
            message: "Invalid id"
        });
    }
    const absenceRequest = await AbsenceRequest.findById(req.params.id).populate('subjectId');
    if (!absenceRequest) {
        return res.status(404).json({
            message: "Absence request is not found"
        });
    }
    const userIdFromToken = req.user.userId;
    if(userIdFromToken != absenceRequest.studentId && userIdFromToken != absenceRequest.subjectId.hostId){
        return res.status(403).json({
            message: "Unauthorized action"
        });
    }
    //Delete related notification and notification recipient
    await Notification.deleteMany({
        referenceModel: "AbsenceRequest",
        referenceId: absenceRequest._id
    }).then(async (list) => {
        if (list.length > 0) {
            await NotificationRecipient.deleteMany({
                notificationId: { $in: list.map(item => item._id) }
            });
        }
        return;
    }).catch((err) => {
        return res.status(500).json({
            message: err.message
        });
    });


    await AbsenceRequest.findByIdAndDelete(req.params.id).then(() => {
        return res.status(200).json({
            message: "Delete absence request successfully"
        });
    }).catch((err) => {
        return res.status(500).json({
            message: err.message
        });
    });
};
module.exports = {
    createRequest,
    updateRequest,
    getAbsenceRequestInfo,
    getTeacherAbsenceRequest,
    getStudentAbsenceRequest,
    deleteRequest
};
 