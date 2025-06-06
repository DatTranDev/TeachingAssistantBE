const Reaction = require('../model/reaction'); 
const mongoose = require('mongoose');

const ReactionService = {
    getTopReactorByCAttend: async (cAttendId, top = 5) => {
        const objectId = new mongoose.Types.ObjectId(cAttendId);

        const result = await Reaction.aggregate([
        {
            $lookup: {
            from: 'discussions',
            localField: 'discussionId',
            foreignField: '_id',
            as: 'discussion'
            }
        },
        { $unwind: '$discussion' },
        {
            $match: {
            'discussion.cAttendId': objectId
            }
        },
        {
            $group: {
            _id: '$userId',
            totalReactions: { $sum: 1 }
            }
        },
        { $sort: { totalReactions: -1 } },
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
            totalReactions: 1,
            user: {
                _id: '$user._id',
                name: '$user.name',
                email: '$user.email',
                avatar: '$user.avatar'
            }
            }
        }
        ]);


        return result;
    },
    getTopReactorBySubject: async (subjectId, top = 5) => {
        const objectId = new mongoose.Types.ObjectId(subjectId);

        const result = await Reaction.aggregate([
            // Join with Discussion
            {
                $lookup: {
                    from: 'discussions',
                    localField: 'discussionId',
                    foreignField: '_id',
                    as: 'discussion'
                }
            },
            { $unwind: '$discussion' },

            // Join with CAttend
            {
                $lookup: {
                    from: 'cattends',
                    localField: 'discussion.cAttendId',
                    foreignField: '_id',
                    as: 'cAttend'
                }
            },
            { $unwind: '$cAttend' },

            // Join with ClassSession
            {
                $lookup: {
                    from: 'classsessions',
                    localField: 'cAttend.classSessionId',
                    foreignField: '_id',
                    as: 'classSession'
                }
            },
            { $unwind: '$classSession' },

            // Filter by subject
            {
                $match: {
                    'classSession.subjectId': objectId
                }
            },

            // Group by user
            {
                $group: {
                    _id: '$userId',
                    totalReactions: { $sum: 1 }
                }
            },
            { $sort: { totalReactions: -1 } },
            { $limit: top },

            // Join with User
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            { $unwind: '$user' },

            // Select fields
            {
                $project: {
                    _id: 0,
                    userId: '$_id',
                    totalReactions: 1,
                    user: {
                        _id: '$user._id',
                        name: '$user.name',
                        email: '$user.email',
                        avatar: '$user.avatar'
                    }
                }
            }
        ]);

        return result;
    }
};
module.exports = ReactionService;
