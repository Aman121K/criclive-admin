import React, {useState} from 'react';
import {getToken} from './api';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';

const App = () => {
  const [token, setToken] = useState(getToken());

  if (!token) {
    return <LoginPage onLoginSuccess={setToken} />;
  }

  return <DashboardPage token={token} onLogout={() => setToken('')} />;
};

export default App;
