import api, { unwrap } from './api';

export const userService = {
  login: (payload) => unwrap(api.post('/auth/login', payload)),
  me: () => unwrap(api.get('/auth/me')),
  refresh: () => unwrap(api.post('/auth/refresh')),
  register: (payload) => unwrap(api.post('/auth/register', payload)),
  forgotPassword: (payload) => unwrap(api.post('/auth/forgot-password', payload)),
  resetPassword: (payload) => unwrap(api.post('/auth/reset-password', payload)),
  logout: () => unwrap(api.post('/auth/logout')),
  profile: () => unwrap(api.get('/profile')),
  updateProfile: (payload) => unwrap(api.put('/profile', payload)),
  cart: () => unwrap(api.get('/cart')),
  addToCart: (payload) => unwrap(api.post('/cart/add', payload)),
  updateCart: (itemId, payload) => unwrap(api.put(`/cart/${itemId}`, payload)),
  removeFromCart: (itemId) => unwrap(api.delete(`/cart/${itemId}`)),
  wishlist: () => unwrap(api.get('/wishlist')),
  addToWishlist: (payload) => unwrap(api.post('/wishlist/add', payload)),
  removeFromWishlist: (itemId) => unwrap(api.delete(`/wishlist/${itemId}`)),
  createWishlistCollection: (payload) => unwrap(api.post('/wishlist/collections', payload)),
};
