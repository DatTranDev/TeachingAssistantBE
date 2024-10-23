const Review = require('../model/review.js');
const User = require('../model/user.js');
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

const findReviewByCAttendId = async (req, res) => {
    const isValidId = await helper.isValidObjectID(req.params.cAttendId);
    if (!isValidId) {
        return res.status(400).json({
            message: "Invalid id"
        });
    }
    const reviews = await Review.find({ cAttendId: req.params.cAttendId });
    return res.status(200).json({
        reviews: reviews
    });
}
module.exports = { addReview, findReviewByCAttendId };