import { token } from '../auth/session.js';
import { readApiResponse } from './response.js';
export async function api(path, method = 'GET', data) {
  let response;
  try {
    response = await fetch('/api' + path, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      ...(data ? { body: JSON.stringify(data) } : {}),
    });
  } catch {
    throw Error(
      'Could not reach the app server. Check that Vite and Flask are running, then retry.',
    );
  }
  return readApiResponse(response);
}
