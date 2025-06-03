const Discussion = require('../model/discussion.js');
const {NotFoundError, } = require('../utils/AppError.js');
const helper = require('../utils/helper.js');
const mongoose = require('mongoose');

const DiscussionService = {
    get: async (id) => {
        if (!helper.isValidObjectID(id)) {
            throw new NotFoundError(`Invalid ID format: ${id}`);
        }
        const discussion = await Discussion.findById(id);
        if (!discussion) throw new NotFoundError(`Discussion with ID ${id} not found`);
        return discussion;
    },

    add: async (data) => {
        const discussion = new Discussion(data);
        await discussion.save();
        return discussion;
    },

    update: async (id, data) => {
        const discussion = await Discussion.findByIdAndUpdate(id, data, { new: true });
        if (!discussion) throw new NotFoundError(`Discussion with ID ${id} not found`);
        return discussion;
    },

    delete: async (id) => {
        const discussion = await Discussion.findByIdAndDelete(id);
        if (!discussion) throw new NotFoundError(`Discussion with ID ${id} not found`);
        return discussion;
    },
    getTopParticipantByCAttend: async (cAttendId, top = 5) => {
        const objectId = new mongoose.Types.ObjectId(cAttendId);

        const result = await Discussion.aggregate([
        {
            $match: {
            cAttendId: objectId
            }
        },
        {
            $group: {
            _id: '$creator',
            totalDiscussions: { $sum: 1 }
            }
        },
        { $sort: { totalDiscussions: -1 } },
        { $limit: top },
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
            userId: '$_id',
            totalDiscussions: 1,
            user: {
                _id: '$user._id',
                name: '$user.name',
                email: '$user.email'
            }
            }
        }
        ]);

        return result;
    },
    getTopParticipantBySubject: async (subjectId, top = 5) => {
        const objectId = new mongoose.Types.ObjectId(subjectId);

         const result = await Discussion.aggregate([
        {
            $lookup: {
                from: 'cattends',
                localField: 'cAttendId',
                foreignField: '_id',
                as: 'cAttend'
            }
        },
        { $unwind: '$cAttend' },

        // Join cattend.classSessionId → classsessions
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
                'classSession.subjectId': objectId
            }
        },

        // Gom nhóm theo creator
        {
            $group: {
                _id: '$creator',
                totalDiscussions: { $sum: 1 }
            }
        },
        { $sort: { totalDiscussions: -1 } },
        { $limit: top },

        // Join với users
        {
            $lookup: {
                from: 'users',
                localField: '_id',
                foreignField: '_id',
                as: 'user'
            }
        },
        { $unwind: '$user' },

        // Format kết quả
        {
            $project: {
                _id: 0,
                userId: '$_id',
                totalDiscussions: 1,
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

module.exports = DiscussionService;