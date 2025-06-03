const express = require('express');
const route = express.Router();
const SystemController = require('../controller/system_controller.js');

route.post('/absence-warning', SystemController.notifyAbsenceViolations);

module.exports = route;