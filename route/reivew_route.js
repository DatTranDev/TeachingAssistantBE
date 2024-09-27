const express = require('express');
const route = express.Router();
const reviewController = require('../controller/review_controller.js');

route.post('/add', reviewController.addReview);
route.get('/findByCAttend/:cAttendId', reviewController.findReviewByCAttendId);

module.exports = route;