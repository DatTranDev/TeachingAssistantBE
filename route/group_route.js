const express = require('express');
const route = express.Router();
const groupController = require('../controller/group_controller.js');
const groupMessageController = require('../controller/groupMessage_controller.js');
const auth = require('../pkg/auth/authentication.js');

route.post('/random/create', groupController.createRandomGroup);
route.get('/cAttend/:cAttendId', groupController.getGroupByCAttendId);
route.post('/join/:groupId', auth.authenticateToken, groupController.joinGroup);
route.post('/create', auth.authenticateToken, groupController.createGroup);
route.patch('/update/:id', auth.authenticateToken, groupController.updateGroup);
route.get('/default/all/:subjectId', auth.authenticateToken, groupController.getDefaultGroups);
route.get('/random/all/:cAttendId', auth.authenticateToken, groupController.getRandomGroups);
route.get('/default/:subjectId', auth.authenticateToken, groupController.getUserDefaultGroup);
route.get('/random/:cAttendId', auth.authenticateToken, groupController.getUserRandomGroup);
route.delete('/leave/:groupId', auth.authenticateToken, groupController.leaveGroup);


// Group message routes
route.post('/message/create', groupMessageController.createGroupMessage);
route.get('/:groupId/message/', groupMessageController.getByGroupId);
route.patch('/message/update/:id', groupMessageController.updateGroupMessage);
route.delete('/message/delete/:id', groupMessageController.deleteGroupMessage);


module.exports = route;

