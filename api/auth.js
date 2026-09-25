const crypto = require('crypto');

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;

function getTokenSecret() {
  if (!process.env.AUTH_TOKEN_SECRET || process.env.AUTH_TOKEN_SECRET.length < 32) {
    throw new Error('AUTH_TOKEN_SECRET must be set to a random value of at least 32 characters');
  }
  return process.env.AUTH_TOKEN_SECRET;
}

function base64Url(value) {
  return Buffer.from(value).toString('base64url');
}

function signToken(payload) {
  const body = base64Url(JSON.stringify(payload));
  const signature = crypto.createHmac('sha256', getTokenSecret()).update(body).digest('base64url');
  return `${body}.${signature}`;
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  const [body, signature] = parts;
  let expected;
  try {
    expected = crypto.createHmac('sha256', getTokenSecret()).update(body).digest('base64url');
  } catch {
    return null;
  }
  const provided = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (provided.length !== expectedBuffer.length || !crypto.timingSafeEqual(provided, expectedBuffer)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!payload || typeof payload.sub !== 'string' || !payload.sub || !Number.isFinite(payload.exp) || payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

function createSessionToken(userId) {
  const now = Math.floor(Date.now() / 1000);
  return signToken({ sub: userId.toString(), iat: now, exp: now + TOKEN_TTL_SECONDS });
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  if (typeof password !== 'string' || password.length < 8) throw new Error('Password must be at least 8 characters');
  return `${salt}:${crypto.scryptSync(password, salt, 64).toString('hex')}`;
}

function verifyPassword(password, storedHash) {
  if (typeof password !== 'string') return false;
  const [salt, savedHash] = String(storedHash || '').split(':');
  if (!salt || !savedHash || !/^[a-f0-9]+$/i.test(savedHash)) return false;
  try {
    const candidate = Buffer.from(crypto.scryptSync(password, salt, 64).toString('hex'), 'hex');
    const saved = Buffer.from(savedHash, 'hex');
    return candidate.length === saved.length && crypto.timingSafeEqual(candidate, saved);
  } catch {
    return false;
  }
}

module.exports = { TOKEN_TTL_SECONDS, createSessionToken, hashPassword, verifyPassword, verifyToken };
