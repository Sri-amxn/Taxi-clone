import React from 'react';
import { Card, Table } from 'antd';

export function Earnings({ rides }) {
  const settled = rides.filter((r) => r.settlement);
  return (
    <Card title="Your earnings, explained">
      <Table
        rowKey="id"
        scroll={{ x: 500 }}
        dataSource={settled}
        columns={[
          { title: 'Trip', dataIndex: 'id' },
          { title: 'Total fare', render: (_, r) => '₹' + r.quote.total },
          {
            title: 'Your share',
            render: (_, r) =>
              `${r.settlement.driver_pct}% · ₹${r.settlement.driver_amount.toFixed(2)}`,
          },
          {
            title: 'Company share',
            render: (_, r) =>
              `${r.settlement.company_pct}% · ₹${r.settlement.company_amount.toFixed(2)}`,
          },
        ]}
        locale={{ emptyText: 'Your completed trips and earnings will appear here.' }}
      />
      <p className="muted">Recorded splits stay unchanged when future rates change.</p>
    </Card>
  );
}
