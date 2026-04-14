import { useState } from 'react';

function Field({ label, children, hint }) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      {children}
      {hint ? <span className="field__hint">{hint}</span> : null}
    </label>
  );
}

export default function LoginForm({ onLogin, onCancel, loading, error }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [manualToken, setManualToken] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (showAdvanced && manualToken.trim()) {
      // Use manual token
      onLogin(manualToken.trim());
    } else if (identifier.trim() && password.trim()) {
      // Use email/password login
      onLogin(null, identifier.trim(), password.trim());
    }
  };

  const handleManualTokenLogin = () => {
    if (manualToken.trim()) {
      onLogin(manualToken.trim());
    }
  };

  return (
    <div className="login-form">
      <div className="login-form__header">
        <h3>Operator Login</h3>
        <p>Sign in with email/password or use an agent key</p>
      </div>

      {error && (
        <div className="error-banner">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {!showAdvanced ? (
          <>
            <Field label="Email or username">
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="operator@example.com"
                disabled={loading}
                required
              />
            </Field>
            <Field label="Password">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
                required
              />
            </Field>
            <div className="button-row">
              <button type="submit" disabled={loading || !identifier.trim() || !password.trim()}>
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
              <button type="button" onClick={() => setShowAdvanced(true)} disabled={loading}>
                Use agent key
              </button>
              {onCancel && (
                <button type="button" onClick={onCancel} disabled={loading}>
                  Cancel
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            <Field label="Agent key or JWT token" hint="Paste erp_agent_sk_... or JWT token">
              <textarea
                rows={4}
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                placeholder="erp_agent_sk_ak_... or JWT token"
                disabled={loading}
              />
            </Field>
            <div className="button-row">
              <button 
                type="button" 
                onClick={handleManualTokenLogin}
                disabled={loading || !manualToken.trim()}
              >
                {loading ? 'Authenticating...' : 'Use token'}
              </button>
              <button type="button" onClick={() => setShowAdvanced(false)} disabled={loading}>
                Back to login
              </button>
              {onCancel && (
                <button type="button" onClick={onCancel} disabled={loading}>
                  Cancel
                </button>
              )}
            </div>
          </>
        )}
      </form>
    </div>
  );
}

