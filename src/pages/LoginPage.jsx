import React, {useCallback, useState} from 'react';
import {getBaseUrl, request, setBaseUrl, setToken} from '../api';
import ToastStack from '../components/ToastStack';

const LoginPage = ({onLoginSuccess}) => {
  const [email, setEmail] = useState('admin@mycricket.com');
  const [password, setPassword] = useState('Admin@123');
  const [baseUrl, setBaseUrlState] = useState(getBaseUrl());
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState([]);

  const pushToast = (message, type = 'info') => {
    setToasts(prev => [...prev, {id: `${Date.now()}-${Math.random()}`, message, type}]);
  };

  const removeToast = useCallback(id => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const handleSubmit = async event => {
    event.preventDefault();

    try {
      setLoading(true);
      setBaseUrl(baseUrl.trim());
      const data = await request('/api/admin/login', {
        method: 'POST',
        body: {email: email.trim(), password},
      });

      setToken(data.token);
      pushToast('Login successful', 'success');
      onLoginSuccess(data.token);
    } catch (err) {
      pushToast(err.message || 'Failed to login', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <ToastStack toasts={toasts} onRemove={removeToast} />
      <section className="login-card">
        <p className="eyebrow">Secure Access</p>
        <h2>Admin Login</h2>
        <p className="muted">Manage users and publish cricket news using R2 image/thumbnail URLs.</p>

        <form onSubmit={handleSubmit} className="stack">
          <label>
            <span>Backend URL</span>
            <input value={baseUrl} onChange={e => setBaseUrlState(e.target.value)} required />
          </label>
          <label>
            <span>Email</span>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </label>
          <label>
            <span>Password</span>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </label>
          <button type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </section>
    </main>
  );
};

export default LoginPage;
