export let token = sessionStorage.getItem('token');
export function setToken(value) {
  token = value;
  if (value) sessionStorage.setItem('token', value);
  else sessionStorage.removeItem('token');
}
