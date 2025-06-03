const AttendRecord = require('../model/attendRecord.js');
const mongoose = require('mongoose');
const { NotFoundError, BadRequestError } = require('../utils/AppError.js');
const helper = require('../utils/helper.js');
const AttendRecordService = {
    getUsersExceededAbsentLimit: async () =>{
        const records = await AttendRecord.aggregate([
        // Chỉ lọc record có status là "KP" (vắng)
        {
            $match: { status: 'KP' }
        },
        // Join vào cattends
        {
            $lookup: {
            from: 'cattends',
            localField: 'cAttendId',
            foreignField: '_id',
            as: 'cAttend'
            }
        },
        { $unwind: '$cAttend' },

        // Join vào classsessions
        {
            $lookup: {
            from: 'classsessions',
            localField: 'cAttend.classSessionId',
            foreignField: '_id',
            as: 'classSession'
            }
        },
        { $unwind: '$classSession' },

        // Join vào subjects
        {
            $lookup: {
            from: 'subjects',
            localField: 'classSession.subjectId',
            foreignField: '_id',
            as: 'subject'
            }
        },
        { $unwind: '$subject' },

        // Gom nhóm theo studentId + subject
        {
            $group: {
            _id: {
                studentId: '$studentId',
                subjectId: '$subject._id'
            },
            absenceCount: { $sum: 1 },
            subjectName: { $first: '$subject.name' },
            maxAbsences: { $first: '$subject.maxAbsences' }
            }
        },

        // Chỉ giữ những ai vượt quá giới hạn
        {
            $match: {
            $expr: { $gt: ['$absenceCount', '$maxAbsences'] }
            }
        },

        // Join để lấy thông tin sinh viên
        {
            $lookup: {
            from: 'users',
            localField: '_id.studentId',
            foreignField: '_id',
            as: 'user'
            }
        },
        { $unwind: '$user' },

        // Trả về dữ liệu cần thiết
        {
            $project: {
            _id: 0,
            studentId: '$_id.studentId',
            subjectId: '$_id.subjectId',
            subjectName: 1,
            absenceCount: 1,
            maxAbsences: 1,
            user: {
                _id: '$user._id',
                name: '$user.name',
                email: '$user.email'
            }
            }
        }
        ]);

        return records;
    },
    getTopAbsentStudents: async (subjectId, top = 5) => {
        const objectId = new mongoose.Types.ObjectId(subjectId);

        const result = await AttendRecord.aggregate([
            // Join vào CAttend
            {
                $lookup: {
                    from: 'cattends',
                    localField: 'cAttendId',
                    foreignField: '_id',
                    as: 'cAttend'
                }
            },
            { $unwind: '$cAttend' },

            // Join vào classSession để lấy subjectId
            {
                $lookup: {
                    from: 'classsessions',
                    localField: 'cAttend.classSessionId',
                    foreignField: '_id',
                    as: 'classSession'
                }
            },
            { $unwind: '$classSession' },

            // Lọc theo subjectId
            {
                $match: {
                    'classSession.subjectId': objectId,
                    status: 'KP' // Chỉ những buổi bị vắng
                }
            },

            // Gom nhóm theo studentId
            {
                $group: {
                    _id: '$studentId',
                    totalAbsences: { $sum: 1 }
                }
            },

            { $sort: { totalAbsences: -1 } },
            { $limit: top },

            // Lấy thông tin user
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            { $unwind: '$user' },

            {
                $project: {
                    _id: 0,
                    studentId: '$_id',
                    totalAbsences: 1,
                    user: {
                        _id: '$user._id',
                        name: '$user.name',
                        email: '$user.email'
                    }
                }
            }
        ]);

        return result;
    }
}
module.exports = AttendRecordService;