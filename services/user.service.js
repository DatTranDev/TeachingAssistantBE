const User = require('../model/user.js');
const Error = require('../utils/AppError.js');

const UserService = {
    get: async (id) => {
        const user = await User.findById(id);
        if (!user) throw new Error.NotFoundError(`User with ID ${id} not found`);
        return user;
    },
};

module.exports = UserService;