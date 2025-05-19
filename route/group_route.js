const express = require('express');
const route = express.Router();
const groupController = require('../controller/group_controller.js');
const groupMessageController = require('../controller/groupMessage_controller.js');

route.post('/createRandomGroup', groupController.createRandomGroup);

route.post('/message/create', groupMessageController.createGroupMessage);
route.get('/:groupId/message/', groupMessageController.getByGroupId);
route.patch('/message/update/:id', groupMessageController.updateGroupMessage);
route.delete('/message/delete/:id', groupMessageController.deleteGroupMessage);

module.exports = route;

