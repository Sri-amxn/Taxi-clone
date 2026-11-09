import React from 'react';
import { Tag } from 'antd';
import { statusText } from '../../utils/status.js';
export function Status({ value }) {
  return (
    <Tag
      color={
        ['COMPLETED', 'available'].includes(value)
          ? 'success'
          : ['CANCELLED', 'NO_DRIVER_FOUND', 'suspended'].includes(value)
            ? 'warning'
            : undefined
      }
    >
      {statusText(value)}
    </Tag>
  );
}
