import React, {useState} from 'react';
import {getBaseUrl, request, setBaseUrl, setToken} from '../api';

const LoginPage = ({onLoginSuccess}) => {
  const [email, setEmail] = useState('admin@mycricket.com');
  const [password, setPassword] = useState('Admin@123');
  const [baseUrl, setBaseUrlState] = useState(getBaseUrl());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async event => {
    event.preventDefault();
    setError('');

    try {
      setLoading(true);
      setBaseUrl(baseUrl.trim());
      const data = await request('/api/admin/login', {
        method: 'POST',
        body: {email: email.trim(), password},
      });

      setToken(data.token);
      onLoginSuccess(data.token);
    } catch (err) {
      setError(err.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
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
          {error ? <p className="error">{error}</p> : null}
        </form>
      </section>
    </main>
  );
};

export default LoginPage;
