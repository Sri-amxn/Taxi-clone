import React, { useState } from 'react';
import { Button, Input, Card, Form, message } from 'antd';
import { api } from '../api/client.js';

export function Profile({ user, onSave }) {
  const [busy, setBusy] = useState(false);
  return (
    <>
      <p className="eyebrow">YOUR ACCOUNT</p>
      <h1>A little more you.</h1>
      <Card className="profile-card">
        <Form
          layout="vertical"
          initialValues={user}
          onFinish={async (values) => {
            setBusy(true);
            try {
              const result = await api('/me', 'PUT', values);
              onSave(result);
              message.success('Profile updated');
            } catch (e) {
              message.error(e.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <Form.Item name="name" label="Display name" rules={[{ required: true, min: 2, max: 80 }]}>
            <Input size="large" />
          </Form.Item>
          <p>Mobile: {user.mobile}</p>
          <p>Permanent code: {user.user_code}</p>
          <p className="muted">Your mobile number and role remain tied to your account.</p>
          <Button type="primary" htmlType="submit" loading={busy}>
            Save profile
          </Button>
        </Form>
      </Card>
    </>
  );
}
