import React from 'react';
export function Icon({ name }) {
  const paths = {
    home: 'M3 10 12 3l9 7v11h-6v-7H9v7H3z',
    trips: 'M5 5h14v16H5zM8 2v6m8-6v6M8 12h8m-8 4h5',
    profile: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M4 21v-3a8 8 0 0 1 16 0v3',
    settings: 'M4 6h16M4 12h16M4 18h16M8 3v6m8 0v6m-6 0v6',
  };
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
