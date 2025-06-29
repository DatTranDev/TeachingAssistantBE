const Group = require('../model/group.js');
const { NotFoundError, BadRequestError } = require('../utils/AppError.js');
const helper = require('../utils/helper.js');
const FirebaseService = require('./firebase.service.js');

const GroupService = {
    get: async (id) => {
        if (!helper.isValidObjectID(id)) {
            throw new NotFoundError(`Invalid ID format: ${id}`);
        }
        const group = await Group.findById(id)
            .populate('members', '_id name email')
            .populate('admin', '_id name email')
            .populate('cAttendId', '_id')
            .populate('subjectId', '_id name')
            .populate('reviewedBy', '_id name');
        if (!group) throw new NotFoundError(`Group with ID ${id} not found`);
        return group;
    },
    add: async (data) => {
        const group = new Group(data);
        await group.save();
        return group;
    },
    update: async (id, data) => {
        if (!helper.isValidObjectID(id)) {
            throw new NotFoundError(`Invalid ID format: ${id}`);
        }
        const group = await Group.findByIdAndUpdate(id, data, { new: true });
        if (!group) throw new NotFoundError(`Group with ID ${id} not found`);
        return group;
    },
    notifyCrossGradingPairs: async (pairs, senderId) => {
        if (!Array.isArray(pairs) || pairs.length === 0) {
            throw new BadRequestError('Pairs must be a non-empty array');
        }

        for (const pair of pairs) {
            const { group, reviewedBy } = pair;

            const groupA = await Group.findById(group).select('name members');
            const groupB = await Group.findById(reviewedBy).select('name');
            await Group.findByIdAndUpdate(reviewedBy, { reviewedBy: group });

            if (!groupA || !groupB) continue;

            const messageToGroupA = {
                title: 'Thông báo chấm chéo',
                senderId: senderId,
                type: 'cross-grading',
                body: `Nhóm của bạn (${groupA.name}) sẽ chấm chéo nhóm ${groupB.name}`,
            };

            await FirebaseService.sendToSpecificDevice(messageToGroupA, groupA.members);

            const messageToGroupB = {
                title: 'Thông báo chấm chéo',
                senderId: senderId,
                type: 'cross-grading',
                body: `Nhóm của bạn (${groupB.name}) sẽ được chấm bởi nhóm ${groupA.name}`,
            };

            await FirebaseService.sendToSpecificDevice(messageToGroupB, groupB.members);
        }

        return { message: 'Cross grading notifications sent' };
    }
}
module.exports = GroupService;