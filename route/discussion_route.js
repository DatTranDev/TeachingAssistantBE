const express = require('express');
const route = express.Router();
const discussionController = require('../controller/discussion_controller.js');
const reactionController = require('../controller/reaction_controller.js');

route.post('/add', discussionController.createDiscussion);
route.patch('/update/:id', discussionController.updateDiscussion);
route.delete('/delete/:id', discussionController.deleteDiscussion);
route.get('/findByCAttend/:cAttendId', discussionController.findByCAttendId);
route.post('/reaction/add', reactionController.createReaction);
route.patch('/reaction/update/:id', reactionController.updateReaction);
route.get('/:discussionId/reactions', reactionController.findByDiscussionId);

module.exports = route;