import React, { useState, useEffect } from 'react';
import { Button, Card, Tag, Alert, message, Skeleton, Spin } from 'antd';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { io } from 'socket.io-client';
import { api } from './api/client.js';
import { token, setToken } from './auth/session.js';
import { Navigation } from './components/layout/Navigation.jsx';
import { Login } from './pages/LoginPage.jsx';
import { Rider } from './pages/RiderPage.jsx';
import { Driver } from './pages/DriverPage.jsx';
import { Admin } from './pages/AdminPage.jsx';
import { Profile } from './pages/ProfilePage.jsx';
import { History } from './components/trips/TripHistory.jsx';

export function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!token);
  const [data, setData] = useState({ rides: [] });
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const page = useLocation();
  const [acting, setActing] = useState(false);
  const [dashboardReady, setDashboardReady] = useState(false);
  async function refresh() {
    try {
      setData(await api('/dashboard'));
      setDashboardReady(true);
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => {
    if (token)
      api('/me')
        .then(setUser)
        .catch(() => {
          setToken(null);
        })
        .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    if (!user) return;
    refresh();
    const timer = setInterval(refresh, 3000);
    const s = io({ auth: { token } });
    s.on('ride.requested', refresh);
    s.on('ride.updated', refresh);
    s.on('ride.expired', refresh);
    return () => {
      clearInterval(timer);
      s.disconnect();
    };
  }, [user]);
  if (loading)
    return (
      <div className="loading">
        <Spin size="large" />
        <p>Getting your workspace ready…</p>
      </div>
    );
  if (!user)
    return (
      <Login
        onLogin={(u) => {
          setUser(u);
          navigate('/');
        }}
      />
    );
  async function action(path, b) {
    if (acting) return;
    setActing(true);
    try {
      await api(path, 'POST', b);
      await refresh();
      message.success('Updated successfully');
    } catch (e) {
      message.error(e.message);
    } finally {
      setActing(false);
    }
  }
  return (
    <div className={'shell role-' + user.role}>
      <aside>
        <div className="brand">
          genz<span>.</span>
          <small>YOUR CITY, CONNECTED</small>
        </div>
        <p className="nav-label">YOUR WORKSPACE</p>
        <Navigation role={user.role} />
        <div className="sidebar-bottom">
          <Tag color="purple">{user.role.toUpperCase()}</Tag>
          <p>{user.user_code}</p>
          <Button
            onClick={() => {
              setToken(null);
              setUser(null);
              setDashboardReady(false);
            }}
          >
            Sign out
          </Button>
        </div>
      </aside>
      <div className="content">
        <header>
          <span>
            Hello, {user.name || 'traveller'} <span className="wave">✦</span>
          </span>
          <Tag color={error ? 'warning' : dashboardReady ? 'success' : undefined}>
            {error
              ? 'Connection interrupted'
              : dashboardReady
                ? 'Workspace up to date'
                : 'Connecting…'}
          </Tag>
        </header>
        {error && <Alert type="error" message={error} showIcon />}
        <div
          key={page.pathname}
          className={'page-enter ' + (acting ? 'is-updating' : '')}
          aria-busy={acting}
        >
          <Spin spinning={acting} tip="Updating your ride…">
            <Routes>
              <Route
                path="/"
                element={
                  !dashboardReady ? (
                    <Card>
                      <Skeleton active paragraph={{ rows: 6 }} />
                    </Card>
                  ) : user.role === 'rider' ? (
                    <Rider data={data} action={action} />
                  ) : user.role === 'driver' ? (
                    <Driver data={data} action={action} refresh={refresh} />
                  ) : (
                    <Admin />
                  )
                }
              />
              <Route
                path="/history"
                element={
                  <>
                    <h1>Your journeys</h1>
                    <History rides={data.rides} />
                  </>
                }
              />
              <Route
                path="/settings"
                element={user.role === 'admin' ? <Admin settings /> : <Navigate to="/" />}
              />
              <Route path="/profile" element={<Profile user={user} onSave={setUser} />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </Spin>
        </div>
        <footer>
          GENZ@WORK <span>Thoughtfully connected. Simply moving.</span>
        </footer>
      </div>
      <Navigation role={user.role} mobile />
    </div>
  );
}
