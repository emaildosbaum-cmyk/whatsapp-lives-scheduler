'use strict';
function apiKeyAuth(req, res, next) {
  if (req.method === 'OPTIONS') return next();
  if (!req.headers['x-api-key'] || req.headers['x-api-key'] !== process.env.API_KEY)
    return res.status(401).json({ error: 'Unauthorized.' });
  next();
}
module.exports = { apiKeyAuth };
