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
                email: '$user.email'
            }
            }
        }
        ]);


        return result;
    }
};
module.exports = ReactionService;
// [
//   {
//     userId: ObjectId("abc123"),
//     totalReactions: 17,
//     user: {
//       _id: ObjectId("abc123"),
//       name: "Nguyễn Văn A",
//       email: "a@gmail.com"
//     }
//   },
//   ...
// ]
