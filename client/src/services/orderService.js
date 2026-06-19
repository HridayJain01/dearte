import api, { unwrap } from './api';

export const orderService = {
  create: (payload) => unwrap(api.post('/orders', payload)),
  list: () => unwrap(api.get('/orders')),
  detail: (id) => unwrap(api.get(`/orders/${id}`)),
  submitChangeRequests: (orderId, requests) =>
    unwrap(api.post(`/orders/${orderId}/change-requests`, { requests })),
  catalogues: () => unwrap(api.get('/catalogues')),
};
