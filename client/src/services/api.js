import axios from 'axios';

const defaultTarget = import.meta.env.VITE_API_PROXY_TARGET || 'http://localhost:5001/api';
const baseURL = import.meta.env.DEV ? '/api' : defaultTarget;

const api = axios.create({
  baseURL,
  withCredentials: true,
  // Generous enough for a large bulk import, but bounded so a stalled request
  // surfaces as an error instead of hanging the admin UI forever.
  timeout: 180000,
});

export const unwrap = async (request) => {
  const response = await request;
  return response.data.data;
};

export default api;
