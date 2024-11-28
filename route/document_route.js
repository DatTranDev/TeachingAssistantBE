const express = require('express');
const route = express.Router();
const documentController = require('../controller/document_controller.js');

route.get('/findByCAttend/:cAttendId', documentController.findByCAttendId);
route.patch('/update/:id', documentController.update);
route.delete('/delete/:id', documentController.deleteDoc);
module.exports = route;