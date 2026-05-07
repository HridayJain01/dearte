import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_PROXY_TARGET || 'http://localhost:5001/api',
  withCredentials: true,
});

export const unwrap = async (request) => {
  const response = await request;
  return response.data.data;
};

export default api;
