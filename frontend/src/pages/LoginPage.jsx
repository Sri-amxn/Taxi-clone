import React, { useState } from 'react';
import { Button, Input, Card, Tag, Alert, Form } from 'antd';
import { api } from '../api/client.js';
import { setToken } from '../auth/session.js';

export function Login({ onLogin }) {
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const [role, setRole] = useState('rider');
  const [error, setError] = useState('');
  return (
    <main className="login">
      <section className="welcome">
        <div className="brand">
          genz<span>.</span>
          <small>MOVE WITH CONFIDENCE</small>
        </div>
        <p className="eyebrow welcome-badge">
          <span aria-hidden="true" /> MADE FOR YOUR EVERYDAY
        </p>
        <h1>
          {role === 'rider' ? 'A simpler way to get there.' : 'Your next opportunity starts here.'}
        </h1>
        <p>
          {role === 'rider'
            ? 'Choose your destination, see your fare, and meet your driver. Simple from start to finish.'
            : 'Go online when you’re ready. Manage your trips and see exactly what you earn.'}
        </p>
        <div className="entry-choices">
          <Button
            size="large"
            type={role === 'rider' ? 'primary' : 'default'}
            onClick={() => {
              setRole('rider');
              setRegister(true);
              setError('');
            }}
          >
            Book a ride
          </Button>
          <Button
            size="large"
            type={role === 'driver' ? 'primary' : 'default'}
            onClick={() => {
              setRole('driver');
              setRegister(true);
              setError('');
            }}
          >
            Drive with us
          </Button>
        </div>
        <div className="welcome-points">
          <span>
            <b>Upfront fares</b>
            <small>Know before you go</small>
          </span>
          <span>
            <b>Live trip updates</b>
            <small>Follow every step</small>
          </span>
          <span>
            <b>Easy to use</b>
            <small>From pickup to arrival</small>
          </span>
        </div>
      </section>
      <Card className="auth-card">
        <div className="auth-heading">
          <Tag>{role === 'rider' ? 'RIDER' : 'DRIVER'} ACCOUNT</Tag>
          <span>{register ? 'GET STARTED' : 'SIGN IN'}</span>
        </div>
        <h2>{register ? 'Let’s get you started' : 'Welcome back'}</h2>
        <p className="muted">
          {register
            ? 'A few details, and you’re ready to go.'
            : 'Sign in with your mobile number and password.'}
        </p>
        {error && <Alert type="error" showIcon message={error} />}
        <Form
          layout="vertical"
          onFinish={async (b) => {
            setBusy(true);
            setError('');
            try {
              if (register) await api('/auth/register', 'POST', { ...b, role });
              const result = await api('/auth/login', 'POST', b);
              setToken(result.token);
              onLogin(result.user);
            } catch (e) {
              setError(e.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {register && (
            <Form.Item name="name" label="Full name" rules={[{ required: true, min: 2, max: 80 }]}>
              <Input autoComplete="name" size="large" placeholder="Your name" />
            </Form.Item>
          )}
          <Form.Item
            name="mobile"
            label="Mobile number"
            rules={[
              {
                required: true,
                pattern: /^\+[1-9]\d{7,14}$/,
                message: 'Include your country code, e.g. +919876543210',
              },
            ]}
          >
            <Input autoComplete="tel" inputMode="tel" size="large" placeholder="+919876543210" />
          </Form.Item>
          <Form.Item name="password" label="Password" rules={[{ required: true, min: 10 }]}>
            <Input.Password
              autoComplete={register ? 'new-password' : 'current-password'}
              size="large"
              placeholder={register ? 'Create password (10+ characters)' : 'Enter password'}
            />
          </Form.Item>
          <Button block size="large" type="primary" htmlType="submit" loading={busy}>
            {register ? 'Create ' + role + ' account' : 'Sign in'}
          </Button>
        </Form>
        <Button
          type="link"
          onClick={() => {
            setRegister(!register);
            setError('');
          }}
        >
          {register ? 'Already have an account? Sign in' : 'New here? Create an account'}
        </Button>
        <p className="fine">No login OTP. Ride-start verification happens at pickup.</p>
      </Card>
    </main>
  );
}
