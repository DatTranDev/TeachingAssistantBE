const Review = require('../model/review.js');
const User = require('../model/user.js');
const cAttend = require('../model/cAttend.js');
const Subject = require('../model/subject.js');
const helper = require('../pkg/helper/helper.js');
const tokenController = require('./token_controller.js');

const addReview = async (req, res) => {
    const isValidId = await helper.isValidObjectID(req.body.studentId);
    if (!isValidId) {
        return res.status(400).json({
            message: "Invalid user id"
        });
    }
    const existUser = await User.findById(req.body.studentId);
    if (!existUser) {
        return res.status(404).json({
            message: "User is not found"
        });
    }
    const isValidId2 = await helper.isValidObjectID(req.body.cAttendId);
    if (!isValidId2) {
        return res.status(400).json({
            message: "Invalid class attendance id"
        });
    }
    const existCAttend = await cAttend.findById(req.body.cAttendId);
    if (!existCAttend) {
        return res.status(404).json({
            message: "Class attendance is not found"
        });
    }
    const userIdFromToken = req.user.userId;
    if (userIdFromToken != req.body.studentId) {
        await tokenController.deleteTokenByUserID(userIdFromToken);
        return res.status(403).json({
            message: "Unauthorized action"
        });
    }
    if (req.body.teachingMethodScore < 1 || req.body.teachingMethodScore > 5) {
        return res.status(400).json({
            message: "Rating must be between 1 and 5"
        });
    }
    if (req.body.atmosphereScore < 1 || req.body.atmosphereScore > 5) {
        return res.status(400).json({
            message: "Rating must be between 1 and 5"
        });
    }
    if (req.body.documentScore < 1 || req.body.documentScore > 5) {
        return res.status(400).json({
            message: "Rating must be between 1 and 5"
        });
    }
    const existReview = await Review.findOne({ cAttendId: req.body.cAttendId, studentId: req.body.studentId });
    if (existReview) {
        return res.status(409).json({
            message: "Review already exists"
        });
    }
    const newReview = new Review(req.body);
    await newReview.save().then((review) => {
        return res.status(201).json({
            review: review
        });
    }).catch(
        err => {
            return res.status(500).json({
                message: "Internal server error: " + err
            });
        });
}
const updateReview = async (req, res) => {
    const isValidId = await helper.isValidObjectID(req.params.id);
    if (!isValidId) {
        return res.status(400).json({
            message: "Invalid id"
        });
    }
    const existReview = await Review.findById(req.params.id);
    if (!existReview) {
        return res.status(404).json({
            message: "Review is not found"
        });
    }
    await Review.findByIdAndUpdate(req.params.id, req.body, { new: true }).then((review) => {
        return res.status(200).json({
            review: review
        });
    }).catch(
        err => {
            return res.status(500).json({
                message: "Internal server error: " + err
            });
        });
}
const deleteReview = async (req, res) => {
    const isValidId = await helper.isValidObjectID(req.params.id);
    if (!isValidId) {
        return res.status(400).json({
            message: "Invalid id"
        });
    }
    const existReview = await Review.findById(req.params.id);
    if (!existReview) {
        return res.status(404).json({
            message: "Review is not found"
        });
    }
    await Review.findByIdAndDelete(req.params.id).then(() => {
        return res.status(204).json();
    }).catch(
        err => {
            return res.status(500).json({
                message: "Internal server error: " + err
            });
        });
}

const findReviewByCAttendId = async (req, res) => {
    const isValidId = await helper.isValidObjectID(req.params.cAttendId);
    if (!isValidId) {
        return res.status(400).json({
            message: "Invalid id"
        });
    }
    //Pagination
    const limit = parseInt(req.query.limit);
    const page = parseInt(req.query.page);
    if(!limit || !page){
        const reviews = await Review.find({ cAttendId: req.params.cAttendId });
        return res.status(200).json({
            reviews: reviews
        });
    }
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const results = {};
    if(endIndex < await Review.countDocuments({cAttendId: req.params.cAttendId}).exec()){
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
    try{
        results.reviews = await Review.find({ cAttendId: req.params.cAttendId }).limit(limit).skip(startIndex).exec();
        return res.status(200).json(results);
    }catch(err){
        return res.status(500).json({
            message: "Internal server error: "+err
        });
    }
}
const findBySubjectAndUser = async (req, res) => {
    const isValidId = await helper.isValidObjectID(req.params.userId);
    if (!isValidId) {
        return res.status(400).json({
            message: "Invalid id"
        });
    }
    const existUser = await User.findById(req.params.userId);
    if (!existUser) {
        return res.status(404).json({
            message: "User is not found"
        });
    }
    const isValidId2 = await helper.isValidObjectID(req.params.subjectId);
    if (!isValidId2) {
        return res.status(400).json({
            message: "Invalid id"
        });
    }
    const existSubject = await Subject.findById(req.params.subjectId);
    if (!existSubject) {
        return res.status(404).json({
            message: "Subject is not found"
        });
    }
    const reviews = await Review.find({
        studentId: req.params.userId
    }).populate({
        path: 'cAttendId',
        populate: { path: 'classSessionId' }
    });
    return res.status(200).json({
        reviews: reviews.filter(review => review.cAttendId.classSessionId.subjectId == req.params.subjectId)
    });
}
module.exports = { addReview, findReviewByCAttendId, findBySubjectAndUser, updateReview, deleteReview };