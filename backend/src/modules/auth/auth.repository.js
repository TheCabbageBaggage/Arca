const crypto = require('crypto');
const env = require('../../config/env');
const { openDatabase } = require('../../db/client');
const { hashSecret, hashAgentSecret, randomToken } = require('./crypto-utils');

class AuthRepository {
  parseScopes(raw) {
    try {
      const parsed = JSON.parse(raw || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  defaultScopesForRole(role) {
    switch (role) {
      case 'admin':
        return ['*'];
      case 'agent':
        return ['agents:*'];
      case 'readonly':
        return ['reports:read'];
      case 'external':
        return ['reports:read', 'finance:read'];
      default:
        return [];
    }
  }

  ensureBootstrapAdmin() {
    const db = openDatabase();

    const existing = db
      .prepare('SELECT id FROM users WHERE email = ? OR username = ? LIMIT 1')
      .get(env.bootstrapAdminEmail.toLowerCase(), env.bootstrapAdminEmail.toLowerCase());

    if (existing) {
      return;
    }

    const userUuid = crypto.randomUUID();
    db.prepare(
      `INSERT INTO users (
        user_uuid, username, email, password_hash, role, scopes, display_name, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)`
    ).run(
      userUuid,
      env.bootstrapAdminEmail.toLowerCase(),
      env.bootstrapAdminEmail.toLowerCase(),
      hashSecret(env.bootstrapAdminPassword),
      'admin',
      JSON.stringify(['*']),
      env.bootstrapAdminName
    );
  }

  mapUser(row) {
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      userUuid: row.user_uuid,
      username: row.username,
      email: row.email,
      name: row.display_name || row.username,
      role: row.role,
      scopes: this.parseScopes(row.scopes),
      passwordHash: row.password_hash,
      active: row.is_active === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  findUserByIdentifier(identifier) {
    this.ensureBootstrapAdmin();

    const normalized = String(identifier || '').trim().toLowerCase();
    if (!normalized) {
      return null;
    }

    const db = openDatabase();
    const row = db
      .prepare(
        `SELECT * FROM users
         WHERE is_active = 1
           AND (lower(email) = ? OR lower(username) = ?)
         LIMIT 1`
      )
      .get(normalized, normalized);

    return this.mapUser(row);
  }

  findUserById(id) {
    this.ensureBootstrapAdmin();

    const db = openDatabase();
    const row = db
      .prepare('SELECT * FROM users WHERE id = ? AND is_active = 1 LIMIT 1')
      .get(Number(id));

    return this.mapUser(row);
  }

  touchLastLogin(userId) {
    const db = openDatabase();
    db.prepare('UPDATE users SET last_login_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(Number(userId));
  }

  createAgentKey(record) {
    const db = openDatabase();

    const keyId = `ak_${randomToken(9)}`;
    const rawSecret = randomToken(32);
    const rawKey = `erp_agent_sk_${keyId}.${rawSecret}`;
    const scopes = Array.isArray(record.scopes) && record.scopes.length
      ? record.scopes
      : this.defaultScopesForRole('agent');

    db.prepare(
      `INSERT INTO agent_keys (
        key_id,
        name,
        key_hash,
        scopes,
        role,
        preferred_llm_provider,
        preferred_llm_model,
        token_budget_per_day,
        expires_at,
        created_by_user_id,
        is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`
    ).run(
      keyId,
      record.name,
      hashAgentSecret(rawSecret),
      JSON.stringify(scopes),
      'agent',
      record.preferredLlmProvider || null,
      record.preferredLlmModel || null,
      record.tokenBudgetPerDay || null,
      record.expiresAt || null,
      record.createdBy || null
    );

    const created = db.prepare('SELECT * FROM agent_keys WHERE key_id = ? LIMIT 1').get(keyId);

    return {
      rawKey,
      key: {
        keyId: created.key_id,
        keyHash: created.key_hash,
        name: created.name,
        scopes: this.parseScopes(created.scopes),
        role: created.role,
        expiresAt: created.expires_at,
        preferredLlmProvider: created.preferred_llm_provider,
        preferredLlmModel: created.preferred_llm_model,
        tokenBudgetPerDay: created.token_budget_per_day,
        createdBy: created.created_by_user_id,
        revokedAt: created.is_active === 1 ? null : created.updated_at,
        lastUsedAt: created.last_used_at
      }
    };
  }

  findAgentKeyById(keyId) {
    const db = openDatabase();

    const row = db
      .prepare('SELECT * FROM agent_keys WHERE key_id = ? AND is_active = 1 LIMIT 1')
      .get(keyId);

    if (!row) {
      return null;
    }

    return {
      keyId: row.key_id,
      keyHash: row.key_hash,
      name: row.name,
      scopes: this.parseScopes(row.scopes),
      role: row.role,
      expiresAt: row.expires_at,
      preferredLlmProvider: row.preferred_llm_provider,
      preferredLlmModel: row.preferred_llm_model,
      tokenBudgetPerDay: row.token_budget_per_day,
      revokedAt: row.is_active === 1 ? null : row.updated_at,
      createdBy: row.created_by_user_id,
      lastUsedAt: row.last_used_at
    };
  }

  touchAgentKey(keyId) {
    const db = openDatabase();
    db.prepare('UPDATE agent_keys SET last_used_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE key_id = ?').run(keyId);
  }
}

module.exports = AuthRepository;
