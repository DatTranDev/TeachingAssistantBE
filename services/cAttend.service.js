const CAttend = require('../model/cAttend.js');

const CAttendService = {
    get: async (id) => {
        const cAttend = await CAttend.findById(id);
        if (!cAttend) throw new Error('CAttend not found');
        return cAttend;
    },

    add: async (data) => {
        const cAttend = new CAttend(data);
        await cAttend.save();
        return cAttend;
    },

    update: async (id, data) => {
        const cAttend = await CAttend.findByIdAndUpdate(id, data, { new: true });
        if (!cAttend) throw new Error('CAttend not found');
        return cAttend;
    },

    delete: async (id) => {
        const cAttend = await CAttend.findByIdAndDelete(id);
        if (!cAttend) throw new Error('CAttend not found');
        return cAttend;
    }
}
module.exports = CAttendService;