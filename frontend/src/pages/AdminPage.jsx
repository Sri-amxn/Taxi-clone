import React, { useState, useEffect } from 'react';
import {
  Button,
  Input,
  InputNumber,
  Select,
  Card,
  Tag,
  Alert,
  Form,
  Table,
  Statistic,
  Switch,
  message,
  Skeleton,
} from 'antd';
import { api } from '../api/client.js';
import { Status } from '../components/common/Status.jsx';
import { ZonePicker } from '../components/maps/ZonePicker.jsx';
import { History } from '../components/trips/TripHistory.jsx';

export function Admin({ settings }) {
  const [zoneForm] = Form.useForm();
  const zoneRadius = Form.useWatch('radius_m', zoneForm);
  const [state, setState] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [driverFilter, setDriverFilter] = useState('all');
  const [driverSearch, setDriverSearch] = useState('');
  async function load() {
    try {
      const [share, rules, zones, drivers, rides, audit] = await Promise.all(
        ['revenue-share', 'fare-rules', 'zones', 'drivers', 'rides', 'audit'].map((k) =>
          api('/admin/' + k),
        ),
      );
      setState({ share, rules, zones, drivers, rides, audit });
      setLoadError('');
    } catch (e) {
      setLoadError(e.message);
    }
  }
  useEffect(() => {
    load();
  }, []);
  async function save(kind, b) {
    try {
      await api('/admin/' + kind, 'PUT', b);
      message.success('Saved with audit trail');
      load();
    } catch (e) {
      message.error(e.message);
    }
  }
  if (!state)
    return loadError ? (
      <Alert type="error" message={loadError} action={<Button onClick={load}>Retry</Button>} />
    ) : (
      <Card>
        <Skeleton active paragraph={{ rows: 6 }} />
      </Card>
    );
  return (
    <>
      <p className="eyebrow">OPERATIONS / ADMIN</p>
      <h1>{settings ? 'Simple controls. Clear accountability.' : 'Your city in motion.'}</h1>
      <div className="features">
        <Card>
          <Statistic title="Total rides" value={state.rides.length} />
        </Card>
        <Card>
          <Statistic
            title="Available drivers"
            value={state.drivers.filter((d) => d.status === 'available' && d.fresh).length}
          />
        </Card>
        <Card>
          <Statistic title="Driver share" value={state.share.driver_pct} suffix="%" />
        </Card>
      </div>
      {settings && (
        <div className="features admin-controls">
          <Card title="Revenue allocation">
            <Form
              layout="vertical"
              initialValues={state.share}
              onFinish={(b) => save('revenue-share', b)}
            >
              <Form.Item name="driver_pct" label="Driver %" rules={[{ required: true }]}>
                <InputNumber min={0} max={100} />
              </Form.Item>
              <Form.Item name="company_pct" label="Company %" rules={[{ required: true }]}>
                <InputNumber min={0} max={100} />
              </Form.Item>
              <Form.Item name="reason" label="Reason for change" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Button htmlType="submit" type="primary">
                Save split
              </Button>
            </Form>
          </Card>
          <Card title="Fare rules">
            <Form
              layout="vertical"
              initialValues={state.rules}
              onFinish={(b) => save('fare-rules', b)}
            >
              {['base', 'per_km', 'per_minute', 'minimum', 'cap'].map((k) => (
                <Form.Item
                  key={k}
                  name={k}
                  label={k.replaceAll('_', ' ')}
                  rules={[{ required: true }]}
                >
                  <InputNumber min={0} />
                </Form.Item>
              ))}
              <Form.Item name="surge_enabled" label="Enable surge" valuePropName="checked">
                <Switch />
              </Form.Item>
              <Form.Item name="reason" label="Reason" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Button htmlType="submit" type="primary">
                Save fares
              </Button>
            </Form>
          </Card>
          <Card title="Add a surge zone">
            <Form
              form={zoneForm}
              layout="vertical"
              initialValues={{
                radius_m: 1000,
                multiplier: 1.2,
                start_hour: 0,
                end_hour: 24,
                days: [0, 1, 2, 3, 4, 5, 6],
                enabled: true,
              }}
              onFinish={(b) => save('zones', { ...b, center: b.center.split(',').map(Number) })}
            >
              <Form.Item
                name="center"
                label="Surge area"
                rules={[{ required: true, message: 'Select a zone center on the map' }]}
              >
                <ZonePicker radius={zoneRadius} />
              </Form.Item>
              {['name', 'reason'].map((k) => (
                <Form.Item key={k} name={k} label={k} rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
              ))}
              {['radius_m', 'multiplier', 'start_hour', 'end_hour'].map((k) => (
                <Form.Item
                  key={k}
                  name={k}
                  label={
                    ['start_hour', 'end_hour'].includes(k)
                      ? k.replaceAll('_', ' ') + ' (UTC)'
                      : k === 'radius_m'
                        ? 'Radius (meters)'
                        : 'Multiplier'
                  }
                >
                  <InputNumber />
                </Form.Item>
              ))}
              <Form.Item name="days" label="Days">
                <Select
                  mode="multiple"
                  options={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(
                    (label, value) => ({ label, value }),
                  )}
                />
              </Form.Item>
              <Form.Item name="enabled" valuePropName="checked">
                <Switch />
              </Form.Item>
              <Button htmlType="submit">Add zone</Button>
            </Form>
            <p>{state.zones.length} zones configured</p>
          </Card>
        </div>
      )}
      {!settings && (
        <>
          <div className="section-heading">
            <h2>Driver presence</h2>
            <Button onClick={load}>Refresh overview</Button>
          </div>
          {loadError && <Alert type="error" message={loadError} />}
          <Card>
            <div className="table-tools">
              <Input.Search
                aria-label="Search drivers"
                placeholder="Search driver ID"
                allowClear
                onChange={(e) => setDriverSearch(e.target.value)}
              />
              <Select
                aria-label="Filter driver presence"
                value={driverFilter}
                onChange={setDriverFilter}
                options={[
                  { value: 'all', label: 'All drivers' },
                  { value: 'available', label: 'Available and fresh' },
                  { value: 'stale', label: 'Stale location' },
                  { value: 'offline', label: 'Offline' },
                ]}
              />
            </div>
            <Table
              rowKey="id"
              scroll={{ x: 480 }}
              dataSource={state.drivers.filter(
                (d) =>
                  String(d.id).includes(driverSearch) &&
                  (driverFilter === 'all' ||
                    (driverFilter === 'available' && d.status === 'available' && d.fresh) ||
                    (driverFilter === 'stale' && !d.fresh) ||
                    (driverFilter === 'offline' && d.status === 'offline')),
              )}
              columns={[
                { title: 'Driver', dataIndex: 'id' },
                { title: 'Status', dataIndex: 'status', render: (v) => <Status value={v} /> },
                {
                  title: 'Location',
                  dataIndex: 'fresh',
                  render: (v) => (
                    <Tag color={v ? 'green' : 'orange'}>{v ? 'Fresh' : 'Stale / missing'}</Tag>
                  ),
                },
              ]}
            />
          </Card>
          <h2>Rides</h2>
          <History rides={state.rides} />
        </>
      )}
      <h2>Change history</h2>
      <Table
        rowKey="id"
        scroll={{ x: 480 }}
        dataSource={state.audit}
        columns={[
          { title: 'Change', dataIndex: 'action' },
          { title: 'Reason', dataIndex: 'reason' },
        ]}
      />
    </>
  );
}
