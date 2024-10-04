const { find } = require('../model/attendRecord.js');
const Review = require('../model/review.js');
const User = require('../model/user.js');
const helper = require('../pkg/helper/helper.js');

const addReview = async (req, res) => {
    const isValidId = await helper.isValidObjectID(req.body.userId);
    if (!isValidId) {
        return res.status(400).json({
            message: "Invalid user id"
        });
    }
    const existUser = await User.findById(req.body.userId);
    if (!existUser) {
        return res.status(404).json({
            message: "User is not found"
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