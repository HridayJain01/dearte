import api, { unwrap } from './api';
import { errorMessage } from '../utils/errors';

/**
 * AI endpoints answer 429/503 with a message written for the reader ("busy,
 * try again in a minute"), so show it; errorMessage would replace any 5xx with
 * a generic "server unavailable". Proxy errors carry no body and fall through.
 */
export function aiErrorMessage(error, fallback) {
  const message = error?.response?.data?.message;
  if (typeof message === 'string' && message) return message;
  return errorMessage(error, fallback);
}

export const aiService = {
  // Storefront
  features: () => unwrap(api.get('/ai/features')),
  smartSearch: (q) => unwrap(api.post('/ai/search', { q })),
  photoSearch: (image) => unwrap(api.post('/ai/photo-search', { image })),
  reorderSuggestions: () => unwrap(api.get('/ai/reorder-suggestions')),
  buildCatalogue: (brief) => unwrap(api.post('/ai/catalogue-builder', { brief })),
  blogPosts: (params) => unwrap(api.get('/blog', { params })),
  blogPost: (slug) => unwrap(api.get(`/blog/${encodeURIComponent(slug)}`)),

  // Admin: AI Studio and Blog
  status: () => unwrap(api.get('/admin/ai/status')),
  saveSettings: (payload) => unwrap(api.put('/admin/ai/settings', payload)),
  runPhotoIndex: () => unwrap(api.post('/admin/ai/photo-index/run')),
  adminPosts: () => unwrap(api.get('/admin/ai/blog/posts')),
  generatePost: () => unwrap(api.post('/admin/ai/blog/generate')),
  updatePost: (id, payload) => unwrap(api.put(`/admin/ai/blog/posts/${id}`, payload)),
  deletePost: (id) => unwrap(api.delete(`/admin/ai/blog/posts/${id}`)),
  regeneratePost: (id) => unwrap(api.post(`/admin/ai/blog/posts/${id}/regenerate`)),
  bannerCopy: (goal) => unwrap(api.post('/admin/ai/banner-copy', { goal })),
  ask: (question) => unwrap(api.post('/admin/ai/ask', { question })),
};
