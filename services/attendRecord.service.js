const AttendRecord = require('../model/attendRecord.js');
const { NotFoundError } = require('../utils/AppError.js');
const helper = require('../utils/helper.js');
const AttendRecordService = {
    getUsersExceededAbsentLimit: async () =>{
        const records = await AttendRecord.aggregate([
        {
            $lookup: {
            from: 'cattends',
            localField: 'cAttendId',
            foreignField: '_id',
            as: 'cAttend'
            }
        },
        { $unwind: '$cAttend' },
        {
            $lookup: {
            from: 'classsessions',
            localField: 'cAttend.classSessionId',
            foreignField: '_id',
            as: 'classSession'
            }
        },
        { $unwind: '$classSession' },
        {
            $lookup: {
            from: 'subjects',
            localField: 'classSession.subjectId',
            foreignField: '_id',
            as: 'subject'
            }
        },
        { $unwind: '$subject' },
        {
            $match: {
            $expr: { $gt: ['$numberOfAbsence', '$subject.maxAbsences'] }
            }
        },
        {
            $project: {
            studentId: 1,
            subjectName: '$subject.name'
            }
        }
        ]);
        return records;
    }
}
module.exports = AttendRecordService;