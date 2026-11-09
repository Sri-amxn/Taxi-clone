import React from 'react';
import { Button, Input, Form } from 'antd';

export function StartRide({ ride, action }) {
  return (
    <Form layout="inline" onFinish={(b) => action(`/rides/${ride.id}/start`, b)}>
      <Form.Item
        name="code"
        rules={[{ required: true, pattern: /^\d{6}$/, message: 'Enter the rider’s 6-digit code' }]}
      >
        <Input
          inputMode="numeric"
          maxLength={6}
          placeholder="Rider’s 6-digit code"
          aria-label="Ride start code"
          autoComplete="off"
        />
      </Form.Item>
      <Button type="primary" htmlType="submit">
        Verify & start trip
      </Button>
    </Form>
  );
}
