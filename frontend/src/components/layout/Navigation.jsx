import React from 'react';
import { NavLink } from 'react-router-dom';
import { Icon } from '../common/Icon.jsx';
export function Navigation({ role, mobile = false }) {
  const links = [
    [
      '/',
      'home',
      mobile
        ? 'Home'
        : role === 'admin'
          ? 'Overview'
          : role === 'driver'
            ? 'Driver home'
            : 'Book a ride',
    ],
    ['/history', 'trips', 'Trips'],
    ...(role === 'admin' ? [['/settings', 'settings', 'Settings']] : []),
    ['/profile', 'profile', 'Profile'],
  ];
  return (
    <nav
      className={mobile ? 'mobile-nav' : 'desktop-nav'}
      aria-label={mobile ? 'Mobile navigation' : 'Main navigation'}
    >
      {links.map(([path, icon, label]) => (
        <NavLink
          key={path}
          to={path}
          end
          className={({ isActive }) => 'nav ' + (isActive ? 'active' : '')}
        >
          <Icon name={icon} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
