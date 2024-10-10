const express = require('express');
const route = express.Router();
const reviewController = require('../controller/review_controller.js');
const auth = require('../pkg/auth/authentication.js');

route.post('/add', auth.authenticateToken, reviewController.addReview);
route.get('/findByCAttend/:cAttendId', reviewController.findReviewByCAttendId);

module.exports = route;