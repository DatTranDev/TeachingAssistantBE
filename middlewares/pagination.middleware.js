/**
 * Pagination middleware
 * Parses ?page=&limit= query params and sets req.pagination = { page, limit, skip }
 */
const paginate =
  (defaultLimit = 20) =>
  (req, res, next) => {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit) || defaultLimit),
    );
    const skip = (page - 1) * limit;
    req.pagination = { page, limit, skip };
    next();
  };

module.exports = { paginate };
