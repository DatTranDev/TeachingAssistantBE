const Discussion = require('../model/discussion.js');
const Reaction = require('../model/reaction.js');
const User = require('../model/user.js');
const UserSubject = require('../model/userSubject.js');
const CAttend = require('../model/cAttend.js');
const helper = require('../utils/helper.js');

const createDiscussion = async (req, res) => {
    const {cAttendId, creator, title, content, images, replyOf} = req.body;
    if (!cAttendId || !creator || !content) {
        return res.status(400).json({ error: "Missing required fields" });
    }
    const existCAttend = await CAttend.findOne({ _id: cAttendId })
    .populate({
        path: 'classSessionId'
    });
    if (!existCAttend) {
        return res.status(404).json({ error: "CAttend not found" });
    }
    const existUserSubject = await UserSubject.findOne({ userId: creator, subjectId: existCAttend.classSessionId.subjectId });
    if (!existUserSubject) {
        return res.status(400).json({ error: "User is not subscribed to the subject of the discussion" });
    }
    try {
        const discussion = new Discussion({
            cAttendId: cAttendId,
            creator: creator,
            title: title,
            content: content,
            images: images,
            replyOf: replyOf,
            upvotes: [],
            downvotes: []
        });
        await discussion.save();
        return res.status(201).json({
            discussion: discussion
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
const updateDiscussion = async (req, res) => {
    const id = req.params.id;
    const isValidId = await helper.isValidObjectID(id);
    if (!isValidId) {
        return res.status(400).json({ error: "Invalid id" });
    }
    const newDiscussion = await Discussion.findOneAndUpdate(
        { _id: id }, 
        req.body, 
        { new: true }
    );
    if (!newDiscussion) {
        return res.status(404).json({ error: "Discussion not found" });
    }
    return res.status(200).json({
        discussion: newDiscussion
    });
}
const deleteDiscussion = async (req, res) => {
    const id = req.params.id;
    const isValidId = await helper.isValidObjectID(id);
    if (!isValidId) {
        return res.status(400).json({ error: "Invalid id" });
    }
    const discussion = await Discussion.findOneAndDelete({ _id: id });
    if (!discussion) {
        return res.status(404).json({ error: "Discussion not found" });
    }
    const reactions = await Reaction.deleteMany({ discussionId: id });
    return res.status(200).json({
        message: "Deleted successfully"
    });
}
const findByCAttendId = async(req, res)=>{
    const isValidId = await helper.isValidObjectID(req.params.cAttendId);
    if(!isValidId){
        return res.status(400).json({
            message: "Invalid CAttend id"
        });
    }
    const existcAttend = await CAttend.findOne({
        _id: req.params.cAttendId
    });
    if(!existcAttend){
        return res.status(404).json({
            message: "CAttend is not found"
        });
    }
    //Pagination
    const page = parseInt(req.query.page);
    const limit = parseInt(req.query.limit);
    const startIndex = (page-1)*limit;
    const endIndex = page*limit;
    const results = {};
    const length = await Discussion.countDocuments({cAttendId: req.params.cAttendId}).exec();
    if(endIndex < length){
        results.next = {
            page: page + 1,
            limit: limit
        };
    }
    if(startIndex > 0){
        results.previous = {
            page: page - 1,
            limit: limit
        };
    }
    var discussions = [];
    if(!limit || !page){
        discussions = await Discussion.find({
            cAttendId: req.params.cAttendId
        }).populate({
            path: 'creator',
            select: '-password'
        }).exec();
    }else{
        discussions = await Discussion.find({
            cAttendId: req.params.cAttendId
        }).limit(limit).skip(startIndex).populate({
            path: 'creator',
            select: '-password'
        }).exec();
    }
    discussions = await Promise.all(discussions.map(async(discussion)=>{
        const reactions = await Reaction.find({
            discussionId: discussion._id
        }).populate({
            path: 'userId',
            select: '-password'
        });
        discussion = discussion.toJSON();
        discussion.reactions = reactions;
        return discussion;
    }));
    results.discussions = discussions
    return res.status(200).json(results);
}
const voteDiscussion = async (req, res) => {
  try {
    const discussionId = req.params.id;
    const userId = req.user.userId;
    console.log('User ID:', userId);
    const { type } = req.body; // 'upvote' or 'downvote'

    if (!['upvote', 'downvote'].includes(type)) {
      return res.status(400).json({ message: 'Invalid vote type' });
    }

    const discussion = await Discussion.findById(discussionId);
    if (!discussion) {
      return res.status(404).json({ message: 'Discussion not found' });
    }
    discussion.upvotes = discussion.upvotes || [];
    discussion.downvotes = discussion.downvotes || [];

    const hasUpvoted = discussion.upvotes.includes(userId);
    const hasDownvoted = discussion.downvotes.includes(userId);

    if (type === 'upvote') {
      // Xóa user khỏi downvotes nếu có
      if (hasDownvoted) {
        discussion.downvotes = discussion.downvotes.filter(
          (id) => id && id.toString() !== userId.toString()
        );
      }

      if (hasUpvoted) {
        // Bỏ vote nếu đã upvote trước đó
        discussion.upvotes = discussion.upvotes.filter(
          (id) => id && id.toString() !== userId.toString()
        );
      } else {
        discussion.upvotes.push(userId);
      }

    } else if (type === 'downvote') {
      // Xóa user khỏi upvotes nếu có
      if (hasUpvoted) {
        discussion.upvotes = discussion.upvotes.filter(
          (id) => id && id.toString() !== userId.toString()
        );
      }

      if (hasDownvoted) {
        discussion.downvotes = discussion.downvotes.filter(
          (id) => id && id.toString() !== userId.toString()
        );
      } else {
        discussion.downvotes.push(userId);
      }
    }
    console.log('Updated discussion:', discussion);
    await discussion.save();

    return res.status(200).json({
      message: 'Vote updated successfully'
    });

  } catch (error) {
    console.error('Vote error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
module.exports = {
    createDiscussion,
    updateDiscussion,
    deleteDiscussion,
    findByCAttendId,
    voteDiscussion
}