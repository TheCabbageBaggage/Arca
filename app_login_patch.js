// First, let's add login-related state near the existing token state
// Find the line with: const [token, setToken] = useState('');
// We'll add after it

const [loginState, setLoginState] = useState({
  isLoggedIn: false,
  user: null,
  loading: false,
  error: null,
  showLoginForm: false
});

// Update canUseApi to check login state
const canUseApi = token.trim().length > 0 || loginState.isLoggedIn;

// Add login function
async function handleLogin(manualToken = null, identifier = null, password = null) {
  setLoginState(prev => ({ ...prev, loading: true, error: null }));
  
  try {
    if (manualToken) {
      // Manual token login
      setToken(manualToken);
      setLoginState(prev => ({ 
        ...prev, 
        isLoggedIn: true, 
        loading: false, 
        showLoginForm: false,
        user: { authType: 'manual_token' }
      }));
      notify('success', 'Authenticated', 'Using manual token');
    } else if (identifier && password) {
      // Email/password login
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password })
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Login failed');
      }
      
      const data = await response.json();
      const token = data.access_token || data.token;
      
      if (!token) {
        throw new Error('No token in response');
      }
      
      setToken(token);
      setLoginState(prev => ({ 
        ...prev, 
        isLoggedIn: true, 
        loading: false, 
        showLoginForm: false,
        user: data.user || { email: identifier, authType: 'jwt' }
      }));
      notify('success', 'Login successful', );
    }
  } catch (error) {
    setLoginState(prev => ({ 
      ...prev, 
      loading: false, 
      error: error.message || 'Login failed' 
    }));
    notify('error', 'Login failed', error.message || 'Authentication error');
  }
}

function handleLogout() {
  setToken('');
  setLoginState({
    isLoggedIn: false,
    user: null,
    loading: false,
    error: null,
    showLoginForm: false
  });
  notify('info', 'Logged out', 'Session cleared');
}

function toggleLoginForm() {
  setLoginState(prev => ({ 
    ...prev, 
    showLoginForm: !prev.showLoginForm,
    error: null 
  }));
}

// Now update the auth-card section to show login form when not logged in
// and user info when logged in
