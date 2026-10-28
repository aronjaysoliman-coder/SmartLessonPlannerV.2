const crypto = require('node:crypto');
const Session = require('../models/Session');
const User = require('../models/User');

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token) return res.status(401).json({ error: 'Please log in to continue.' });

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const session = await Session.findOne({ tokenHash, expiresAt: { $gt: new Date() } }).select('_id userId');
    if (!session) return res.status(401).json({ error: 'Your session expired. Please log in again.' });

    const user = await User.findById(session.userId).select('uid fullName email photoUrl role');
    if (!user) {
      await Session.deleteOne({ _id: session._id });
      return res.status(401).json({ error: 'This account is no longer available.' });
    }

    req.uid = user.uid;
    req.auth = user;
    req.sessionId = session._id;
    next();
  } catch (err) {
    console.error('[auth] session verification failed:', err.message);
    res.status(500).json({ error: 'Could not verify your session.' });
  }
}

module.exports = { requireAuth };
