// Turns validated ?page=&limit= query values into skip/limit numbers for MongoDB.

function parsePagination(query, defaultLimit = 12) {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || defaultLimit;
  return { page, limit, skip: (page - 1) * limit };
}

function buildPagination({ page, limit }, total) {
  return { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) };
}

module.exports = { parsePagination, buildPagination };
