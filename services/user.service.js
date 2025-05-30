const User = require('../model/user.js');
const {NotFoundError} = require('../utils/AppError.js');

const UserService = {
    get: async (id) => {
        const user = await User.findById(id);
        if (!user) throw new NotFoundError(`User with ID ${id} not found`);
        return user;
    },
};

module.exports = UserService;