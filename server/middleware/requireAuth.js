import jwt from 'jsonwebtoken';

/**
 * JWT Authentication Middleware
 * Verifies Bearer token and sets req.user = { id, email, name, role }
 */
export default function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Temporary 2FA-pending tokens are signed with the same secret but must
    // never be accepted as a full session.
    if (decoded.is2faPending || (decoded.typ && decoded.typ !== 'access') || !decoded.id) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
