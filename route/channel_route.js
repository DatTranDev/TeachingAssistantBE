const express = require('express');
const route= express.Router();
const channelController = require('../controller/channel_controller.js');
const auth = require('../pkg/auth/authentication.js');
const postController = require('../controller/post_controller.js');
const reactionController = require('../controller/reaction_controller.js');

route.post('/add', channelController.addChannel);
route.post('/addMany', channelController.addManyChannels);
route.get('/findBySubject/:subjectId', channelController.findBySubjectId);
route.patch('/update/:id', channelController.updateChannel);
route.delete('/delete/:id', channelController.deleteChannel);

route.post('/post/add', postController.addPost);
route.get('/post/find/:channelId', postController.findByChannelId);
route.patch('/post/update/:id', postController.updatePost);
route.delete('/post/delete/:id', postController.deletePost);

route.post('/post/reaction/add', reactionController.createReaction);
route.patch('/post/reaction/update/:id', reactionController.updateReaction);
route.get('/post/reaction/find/:postId', reactionController.findByPostId);

module.exports = route;