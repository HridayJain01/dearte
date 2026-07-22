import axios from 'axios';

const defaultTarget = import.meta.env.VITE_API_PROXY_TARGET || 'http://localhost:5001/api';
const baseURL = import.meta.env.DEV ? '/api' : defaultTarget;

const api = axios.create({
  baseURL,
  withCredentials: true,
  // Marks every request as a same-origin XHR. The API requires this custom header
  // on state-changing calls as a CSRF defense — a cross-site forgery cannot set it
  // without a CORS preflight that the server's origin allow-list rejects.
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
  // Generous enough for a large bulk import, but bounded so a stalled request
  // surfaces as an error instead of hanging the admin UI forever.
  timeout: 180000,
});

export const unwrap = async (request) => {
  const response = await request;
  return response.data.data;
};

export default api;
