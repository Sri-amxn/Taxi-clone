import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import { App } from './App.jsx';
import { theme } from './theme.js';
import './styles/index.scss';

createRoot(document.getElementById('root')).render(
  <ConfigProvider theme={theme}>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </ConfigProvider>,
);
