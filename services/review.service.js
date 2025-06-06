const Review = require('../model/review.js');
const mongoose = require('mongoose');
const { NotFoundError } = require('../utils/AppError.js');
const ReviewService = {
    getTopReviewers: async (subjectId, top = 5) => {
        const objectId = new mongoose.Types.ObjectId(subjectId);

        const result = await Review.aggregate([
            // Join với CAttend
            {
                $lookup: {
                    from: 'cattends',
                    localField: 'cAttendId',
                    foreignField: '_id',
                    as: 'cAttend'
                }
            },
            { $unwind: '$cAttend' },

            // Join với ClassSession
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

            // Gom nhóm theo studentId
            {
                $group: {
                    _id: '$studentId',
                    reviewCount: { $sum: 1 }
                }
            },
            { $sort: { reviewCount: -1 } },
            { $limit: top },

            // Join với User
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            { $unwind: '$user' },

            // Project ra thông tin
            {
                $project: {
                    _id: 0,
                    studentId: '$_id',
                    reviewCount: 1,
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
}
module.exports = ReviewService;
