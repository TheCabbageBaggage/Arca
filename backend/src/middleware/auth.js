const AuthService = require('../modules/auth/auth.service');

const authService = new AuthService();

function getBearerToken(req) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return null;
  }
  return token.trim();
}

function authenticate(req, _res, next) {
  try {
    const token = getBearerToken(req);
    if (!token) {
      const error = new Error('Missing bearer token');
      error.statusCode = 401;
      throw error;
    }

    const auth = authService.authenticateBearer(token);
    req.auth = auth;
    req.user = auth.user;
    next();
  } catch (error) {
    next(error);
  }
}

function optionalAuthenticate(req, _res, next) {
  const token = getBearerToken(req);
  if (!token) {
    req.auth = null;
    req.user = null;
    return next();
  }

  try {
    const auth = authService.authenticateBearer(token);
    req.auth = auth;
    req.user = auth.user;
    next();
  } catch (error) {
    next(error);
  }
}

function requireRole(...roles) {
  return (req, _res, next) => {
    try {
      if (!req.user) {
        const error = new Error('Authentication required');
        error.statusCode = 401;
        throw error;
      }

      if (!roles.includes(req.user.role)) {
        const error = new Error('Insufficient privileges');
        error.statusCode = 403;
        throw error;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

function scopeMatches(granted, required) {
  if (granted === '*' || required === '*') {
    return true;
  }

  if (granted === required) {
    return true;
  }

  if (granted.endsWith(':*')) {
    const prefix = granted.slice(0, -2);
    return required === prefix || required.startsWith(`${prefix}:`);
  }

  return false;
}

function requireScopes(...requiredScopes) {
  return (req, _res, next) => {
    try {
      if (!req.auth) {
        const error = new Error('Authentication required');
        error.statusCode = 401;
        throw error;
      }

      const granted = Array.isArray(req.auth.scopes) ? req.auth.scopes : [];
      const missing = requiredScopes.filter((requiredScope) => !granted.some((grantedScope) => scopeMatches(grantedScope, requiredScope)));

      if (missing.length > 0) {
        const error = new Error(`Missing required scope(s): ${missing.join(', ')}`);
        error.statusCode = 403;
        throw error;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = {
  authenticate,
  optionalAuthenticate,
  requireRole,
  requireScopes
};
