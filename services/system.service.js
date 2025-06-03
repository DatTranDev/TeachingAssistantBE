const AttendRecordService = require('./attendRecord.service.js');
const NotificationService = require('./notification.service.js');
const {AppError} = require('../utils/AppError.js');
const { title } = require('process');

const SystemService = {
    notifyAbsenceViolations: async ()=>{
        try {
            const records = await AttendRecordService.getUsersExceededAbsentLimit();
            if (records.length === 0) {
                return;
            }
            await Promise.all(records.map(async (record) => {
                const { studentId, subjectName } = record;
                await NotificationService.send({
                    title: "Cảnh báo vắng học",
                    content: `Bạn vượt quá số buổi vắng học cho môn ${subjectName}. Vui lòng kiểm tra lại.`,
                    type: "absent_warning",
                    referenceModel: "Subject",
                    referenceId: record.subjectId
                }, [studentId], null);
                console.log(`Notify student ${studentId} about exceeding absence limit for subject ${subjectName}`);
            }));
        } catch (error) {
            throw new Error(`Failed to notify absence violations: ${error.message}`);
        }
    }
}
module.exports = SystemService;