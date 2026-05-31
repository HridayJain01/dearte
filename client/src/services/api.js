import axios from 'axios';

const defaultTarget = import.meta.env.VITE_API_PROXY_TARGET || 'http://localhost:5001/api';
const baseURL = import.meta.env.DEV ? '/api' : defaultTarget;

const api = axios.create({
  baseURL,
  withCredentials: true,
});

export const unwrap = async (request) => {
  const response = await request;
  return response.data.data;
};

export default api;
