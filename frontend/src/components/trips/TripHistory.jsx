import React, { useState } from 'react';
import { Input, Select, Card, Table, Empty } from 'antd';
import { TripDetails } from './TripDetails.jsx';
import { coordinateText } from './TripDetails.jsx';
import { Status } from '../common/Status.jsx';
import { statusText } from '../../utils/status.js';

export function History({ rides }) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const filtered = rides.filter(
    (r) =>
      (status === 'all' || r.status === status) &&
      `${r.id} ${r.driver_name || ''} ${r.rider_name || ''} ${r.quote.origin_label || ''} ${r.quote.destination_label || ''}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <Card className="table-card">
      <div className="table-tools">
        <Input.Search
          aria-label="Search rides"
          placeholder="Search trip, name or location"
          allowClear
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select
          aria-label="Filter ride status"
          value={status}
          onChange={setStatus}
          options={[
            { value: 'all', label: 'All statuses' },
            ...Array.from(new Set(rides.map((r) => r.status))).map((value) => ({
              value,
              label: statusText(value),
            })),
          ]}
        />
      </div>
      <Table
        rowKey="id"
        scroll={{ x: 800 }}
        dataSource={filtered}
        expandable={{
          expandedRowRender: (ride) => <TripDetails ride={ride} />,
          expandRowByClick: true,
          columnTitle: 'Details',
        }}
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                rides.length
                  ? 'No matching trips. Try another filter.'
                  : 'Your trips will appear here after you book a ride.'
              }
            />
          ),
        }}
        columns={[
          { title: 'Trip', dataIndex: 'id', render: (v) => '#GZ' + v },
          { title: 'Status', dataIndex: 'status', render: (v) => <Status value={v} /> },
          {
            title: 'Route',
            render: (_, r) => (
              <div className="history-route">
                <span>{r.quote.origin_label || coordinateText(r.quote.origin)}</span>
                <span>→ {r.quote.destination_label || coordinateText(r.quote.destination)}</span>
              </div>
            ),
          },
          { title: 'Fare', render: (_, r) => '₹' + r.quote.total },
          { title: 'Driver', render: (_, r) => r.driver_name || 'Not assigned' },
        ]}
      />
    </Card>
  );
}
