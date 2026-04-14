        <section className=auth-card>
          {loginState.isLoggedIn ? (
            <div className=session-info>
              <p className=section-header__eyebrow>Session</p>
              <div className=user-info>
                <strong>{loginState.user?.name || loginState.user?.email || 'Operator'}</strong>
                <span>{loginState.user?.authType === 'jwt' ? 'JWT session' : 'Manual token'}</span>
              </div>
              <div className=button-row>
                <button type=button onClick={() => loadDashboard(false)} disabled={!canUseApi}>
                  Refresh all
                </button>
                <button
                  type=button
                  onClick={() => {
                    loadTasks(false);
                    notify('info', 'Tasks refreshed', 'Latest agent tasks loaded');
                  }}
                  disabled={!canUseApi}
                >
                  Tasks
                </button>
                <button type=button onClick={handleLogout}>
                  Logout
                </button>
              </div>
              <div className=token-display>
                <Field label=Current token hint=Read-only>
                  <textarea
                    rows={2}
                    value={token.substring(0, 50) + (token.length > 50 ? '...' : '')}
                    readOnly
                    onClick={(e) => e.target.select()}
                  />
                </Field>
              </div>
            </div>
          ) : loginState.showLoginForm ? (
            <LoginForm
              onLogin={handleLogin}
              onCancel={() => setLoginState(prev => ({ ...prev, showLoginForm: false }))}
              loading={loginState.loading}
              error={loginState.error}
            />
          ) : (
            <div className=login-prompt>
              <p className=section-header__eyebrow>API access</p>
              <p>Sign in to access the console</p>
              <div className=button-row>
                <button type=button onClick={toggleLoginForm}>
                  Sign in
                </button>
                <button type=button onClick={() => setLoginState(prev => ({ ...prev, showLoginForm: true }))}>
                  Use token
                </button>
              </div>
            </div>
          )}
          <div className={}>Socket: {socketState}</div>
        </section>
