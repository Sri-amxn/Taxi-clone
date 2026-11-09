export const statusText = (value) =>
  ({
    SEARCHING: 'Finding a driver',
    ASSIGNED: 'Driver assigned',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
    NO_DRIVER_FOUND: 'No drivers nearby',
    offline: 'Offline',
    available: 'Ready for requests',
    ride_requested: 'New ride request',
    ride_accepted: 'Ride accepted',
    arriving_at_pickup: 'On the way to pickup',
    waiting_for_rider: 'Waiting at pickup',
    ongoing_ride: 'Trip in progress',
    ride_completed: 'Trip completed',
    temporarily_unavailable: 'Taking a break',
    suspended: 'Account suspended',
  })[value] ||
  value?.replaceAll('_', ' ') ||
  'Loading status…';
