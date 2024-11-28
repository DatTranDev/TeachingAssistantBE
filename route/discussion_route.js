const express = require('express');
const route = express.Router();
const discussionController = require('../controller/discussion_controller.js');

route.post('/add', discussionController.createDiscussion);
route.patch('/update/:id', discussionController.updateDiscussion);
route.delete('/delete/:id', discussionController.deleteDiscussion);
route.get('/findByCAttend/:cAttendId', discussionController.findByCAttendId);

module.exports = route;