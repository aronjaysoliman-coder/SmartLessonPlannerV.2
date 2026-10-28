const User = require('../models/User');

async function requireAdmin(req, res, next) {
  try {
    const user = await User.findOne({ uid: req.uid }).select('role').lean();
    if (user?.role !== 'admin') {
      return res.status(403).json({ error: 'Administrator access is required.' });
    }
    next();
  } catch (err) {
    console.error('[admin] role check failed:', err.message);
    res.status(500).json({ error: 'Could not verify administrator access.' });
  }
}

module.exports = { requireAdmin };