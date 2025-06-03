const SystemService = require('../services/system.service.js');
const { AppError } = require('../utils/AppError.js');
const SystemController = {
    notifyAbsenceViolations: async (req, res) => {
        await SystemService.notifyAbsenceViolations();
        return res.status(200).json({ message: 'Notifications sent successfully' });
    }
};
module.exports = SystemController;