const express = require('express');
const route = express.Router();
const reviewController = require('../controller/review_controller.js');
const auth = require('../middlewares/auth.middleware.js');

route.post('/add', auth, reviewController.addReview);
route.patch('/update/:id', auth, reviewController.updateReview);
route.delete('/delete/:id', auth, reviewController.deleteReview);

route.get('/findByCAttend/:cAttendId', auth, reviewController.findReviewByCAttendId);

module.exports = route;