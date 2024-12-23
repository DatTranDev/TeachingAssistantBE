const express = require('express');
const route = express.Router();
const reviewController = require('../controller/review_controller.js');
const auth = require('../pkg/auth/authentication.js');

route.post('/add', auth.authenticateToken, reviewController.addReview);
route.patch('/update/:id', auth.authenticateToken, reviewController.updateReview);
route.delete('/delete/:id', auth.authenticateToken, reviewController.deleteReview);

route.get('/findByCAttend/:cAttendId', auth.authenticateToken, reviewController.findReviewByCAttendId);

module.exports = route;