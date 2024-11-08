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
module.exports = { addReview, findReviewByCAttendId };