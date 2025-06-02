const express = require('express');
const route = express.Router();
const groupController = require('../controller/group_controller.js');
const groupMessageController = require('../controller/groupMessage_controller.js');
const auth = require('../middlewares/auth.middleware.js');

route.post('/random/create',auth, groupController.createRandomGroup);
route.get('/cAttend/:cAttendId', groupController.getGroupByCAttendId);
route.post('/join/:groupId', auth, groupController.joinGroup);
route.post('/create', auth, groupController.createGroup);
route.patch('/update/:id', auth, groupController.updateGroup);
route.get('/default/all/:subjectId', auth, groupController.getDefaultGroups);
route.get('/random/all/:cAttendId', auth, groupController.getRandomGroups);
route.get('/default/:subjectId', auth, groupController.getUserDefaultGroup);
route.get('/random/:cAttendId', auth, groupController.getUserRandomGroup);
route.delete('/leave/:groupId', auth, groupController.leaveGroup);


// Group message routes
route.post('/message/create', groupMessageController.createGroupMessage);
route.get('/:groupId/message/', groupMessageController.getByGroupId);
route.patch('/message/update/:id', groupMessageController.updateGroupMessage);
route.delete('/message/delete/:id', groupMessageController.deleteGroupMessage);

route.post('/crossPairs', auth, groupController.notifyCrossGradingPairs);

module.exports = route;

