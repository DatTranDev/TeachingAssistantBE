/**
 * Generic helper for offset-based paginated Mongoose queries.
 *
 * @param {mongoose.Model} Model - Mongoose model to query
 * @param {object} filter - MongoDB filter object
 * @param {object} options - { pagination: { page, limit, skip }, sort?, populate? }
 * @returns {{ data: any[], pagination: object }}
 */
async function paginatedQuery(Model, filter = {}, options = {}) {
  const { page, limit, skip } = options.pagination;
  const sort = options.sort ?? { createdAt: -1 };

  let query = Model.find(filter).sort(sort).skip(skip).limit(limit);
  if (options.populate) {
    if (Array.isArray(options.populate)) {
      options.populate.forEach((p) => {
        query = query.populate(p);
      });
    } else {
      query = query.populate(options.populate);
    }
  }

  const [data, total] = await Promise.all([
    query.lean(),
    Model.countDocuments(filter),
  ]);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
    },
  };
}

module.exports = { paginatedQuery };
