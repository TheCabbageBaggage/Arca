const env = require('../../config/env');
const AuthRepository = require('./auth.repository');
const { signJwt, verifySecret, hashAgentSecret, verifyJwt } = require('./crypto-utils');

class AuthService {
  constructor(repository = new AuthRepository()) {
    this.repository = repository;
  }

  login(identifier, password) {
    const user = this.repository.findUserByIdentifier(identifier);
    if (!user) {
      const error = new Error('Invalid credentials');
      error.statusCode = 401;
      throw error;
    }

    if (!verifySecret(password, user.passwordHash)) {
      const error = new Error('Invalid credentials');
      error.statusCode = 401;
      throw error;
    }

    this.repository.touchLastLogin(user.id);

    const token = signJwt(
      {
        sub: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        scopes: user.scopes,
        authType: 'jwt'
      },
      env.jwtSecret,
      env.jwtExpiresIn
    );

    return {
      access_token: token,
      token: token,
      token_type: 'Bearer',
      tokenType: 'Bearer',
      expires_in: env.jwtExpiresIn,
      expiresIn: env.jwtExpiresIn,
      user: this.publicUser(user)
    };
  }

  createAgentKey(currentUser, payload) {
    if (!currentUser || currentUser.role !== 'admin') {
      const error = new Error('Admin privileges required');
      error.statusCode = 403;
      throw error;
    }

    if (!payload.name || typeof payload.name !== 'string') {
      const error = new Error('Agent key name is required');
      error.statusCode = 400;
      throw error;
    }

    const created = this.repository.createAgentKey({
      name: payload.name,
      scopes: payload.scopes,
      expiresAt: payload.expires_at || payload.expiresAt,
      preferredLlmProvider: payload.preferred_llm_provider || payload.preferredLlmProvider,
      preferredLlmModel: payload.preferred_llm_model || payload.preferredLlmModel,
      tokenBudgetPerDay: payload.token_budget_per_day || payload.tokenBudgetPerDay,
      spendApprovalThresholdUsd: payload.spend_approval_threshold_usd || payload.spendApprovalThresholdUsd,
      createdBy: currentUser.id
    });

    return {
      key: created.rawKey,
      key_id: created.key.keyId,
      name: created.key.name,
      scopes: created.key.scopes,
      expires_at: created.key.expiresAt,
      preferred_llm_provider: created.key.preferredLlmProvider,
      preferred_llm_model: created.key.preferredLlmModel,
      token_budget_per_day: created.key.tokenBudgetPerDay,
      spend_approval_threshold_usd: created.key.spendApprovalThresholdUsd,
      created_by: created.key.createdBy
    };
  }

  authenticateBearer(token) {
    const rawToken = String(token || '').trim();
    if (!rawToken) {
      const error = new Error('Missing bearer token');
      error.statusCode = 401;
      throw error;
    }

    if (rawToken.startsWith('erp_agent_sk_')) {
      return this.authenticateAgentKey(rawToken);
    }

    if (rawToken.split('.').length === 3) {
      const jwt = this.verifyJwtToken(rawToken);
      return {
        type: 'jwt',
        user: jwt.user,
        scopes: jwt.scopes,
        raw: jwt.payload
      };
    }

    const error = new Error('Unsupported bearer token');
    error.statusCode = 401;
    throw error;
  }

  authenticateJwt(token) {
    const payload = this.verifyJwtToken(token);
    return {
      type: 'jwt',
      user: payload.user,
      scopes: payload.scopes,
      payload: payload.payload
    };
  }

  authenticateAgentKey(token) {
    const parsed = this.parseAgentKey(token);
    if (!parsed) {
      const error = new Error('Invalid agent key format');
      error.statusCode = 401;
      throw error;
    }

    const { keyId, secret } = parsed;
    const entry = this.repository.findAgentKeyById(keyId);
    if (!entry || entry.revokedAt) {
      const error = new Error('Invalid agent key');
      error.statusCode = 401;
      throw error;
    }

    if (entry.expiresAt && new Date(entry.expiresAt) <= new Date()) {
      const error = new Error('Agent key expired');
      error.statusCode = 401;
      throw error;
    }

    const expectedHash = hashAgentSecret(secret);
    if (!this.constantTimeEqual(expectedHash, entry.keyHash)) {
      const error = new Error('Invalid agent key');
      error.statusCode = 401;
      throw error;
    }

    this.repository.touchAgentKey(keyId);

    return {
      type: 'agent_key',
      user: {
        id: entry.keyId,
        email: null,
        username: entry.name,
        name: entry.name,
        role: entry.role,
        scopes: entry.scopes,
        authType: 'agent_key',
        keyId: entry.keyId,
        preferredLlmProvider: entry.preferredLlmProvider,
        preferredLlmModel: entry.preferredLlmModel,
        tokenBudgetPerDay: entry.tokenBudgetPerDay
      },
      scopes: entry.scopes,
      agentKey: entry
    };
  }

  publicUser(user) {
    return {
      id: user.id,
      email: user.email,
      username: user.email,
      name: user.name,
      role: user.role,
      scopes: user.scopes
    };
  }

  verifyJwtToken(token) {
    const payload = verifyJwt(token, env.jwtSecret);
    const user = this.repository.findUserById(payload.sub);
    if (!user) {
      const error = new Error('Unknown user');
      error.statusCode = 401;
      throw error;
    }
    return {
      payload,
      user: this.publicUser(user),
      scopes: Array.isArray(payload.scopes) ? payload.scopes : user.scopes
    };
  }

  parseAgentKey(token) {
    const match = /^erp_agent_sk_(ak_[A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/.exec(String(token || '').trim());
    if (!match) {
      return null;
    }
    return {
      keyId: match[1],
      secret: match[2]
    };
  }

  constantTimeEqual(a, b) {
    const crypto = require('crypto');
    const aBuf = Buffer.from(String(a));
    const bBuf = Buffer.from(String(b));
    if (aBuf.length !== bBuf.length) {
      return false;
    }
    return crypto.timingSafeEqual(aBuf, bBuf);
  }
}

module.exports = AuthService;
