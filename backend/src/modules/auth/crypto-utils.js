const crypto = require('crypto');

function base64UrlEncode(input) {
  return Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function base64UrlDecode(input) {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(padded, 'base64').toString('utf8');
}

function timingSafeEqual(a, b) {
  const aBuf = Buffer.from(String(a));
  const bBuf = Buffer.from(String(b));
  if (aBuf.length !== bBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(aBuf, bBuf);
}

function randomToken(bytes = 32) {
  return base64UrlEncode(crypto.randomBytes(bytes));
}

function hashSecret(secret, salt = crypto.randomBytes(16).toString('hex')) {
  const derived = crypto.pbkdf2Sync(secret, salt, 120000, 32, 'sha256').toString('hex');
  return `pbkdf2_sha256$120000$${salt}$${derived}`;
}

function verifySecret(secret, stored) {
  if (typeof stored !== 'string') {
    return false;
  }
  const [algorithm, iterationsStr, salt, hash] = stored.split('$');
  if (algorithm !== 'pbkdf2_sha256' || !iterationsStr || !salt || !hash) {
    return false;
  }
  const iterations = Number(iterationsStr);
  const derived = crypto.pbkdf2Sync(secret, salt, iterations, 32, 'sha256').toString('hex');
  return timingSafeEqual(derived, hash);
}

function hashAgentSecret(secret) {
  return crypto.createHmac('sha256', require('../../config/env').agentKeySecret).update(secret).digest('hex');
}

function signJwt(payload, secret, expiresIn = '8h') {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const exp = parseExpiresIn(expiresIn, now);
  const body = { ...payload, iat: now, exp };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedBody = base64UrlEncode(JSON.stringify(body));
  const unsigned = `${encodedHeader}.${encodedBody}`;
  const signature = crypto.createHmac('sha256', secret).update(unsigned).digest();
  return `${unsigned}.${base64UrlEncode(signature)}`;
}

function verifyJwt(token, secret) {
  const parts = String(token).split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid token format');
  }

  const [encodedHeader, encodedBody, encodedSignature] = parts;
  const unsigned = `${encodedHeader}.${encodedBody}`;
  const expected = crypto.createHmac('sha256', secret).update(unsigned).digest();
  const actual = Buffer.from(encodedSignature.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
    throw new Error('Invalid token signature');
  }

  const payload = JSON.parse(base64UrlDecode(encodedBody));
  if (payload.exp && Math.floor(Date.now() / 1000) >= payload.exp) {
    throw new Error('Token expired');
  }
  return payload;
}

function parseExpiresIn(expiresIn, now) {
  if (typeof expiresIn === 'number') {
    return now + expiresIn;
  }
  const match = /^([0-9]+)([smhd])$/.exec(String(expiresIn).trim());
  if (!match) {
    return now + 8 * 60 * 60;
  }
  const value = Number(match[1]);
  const unit = match[2];
  const factor = { s: 1, m: 60, h: 3600, d: 86400 }[unit];
  return now + value * factor;
}

module.exports = {
  base64UrlEncode,
  base64UrlDecode,
  hashSecret,
  hashAgentSecret,
  randomToken,
  signJwt,
  verifyJwt,
  verifySecret
};
