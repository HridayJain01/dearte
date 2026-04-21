import api, { unwrap } from './api';

export const productService = {
  home: () => unwrap(api.get('/site/home')),
  products: (params) => unwrap(api.get('/products', { params })),
  product: (styleCode) => unwrap(api.get(`/products/${styleCode}`)),
  education: (slug) => unwrap(api.get(`/education/${slug}`)),
  events: () => unwrap(api.get('/events')),
  trustedBy: () => unwrap(api.get('/trusted-by')),
  testimonials: () => unwrap(api.get('/testimonials')),
  careers: () => unwrap(api.get('/careers')),
  staticPage: (slug) => unwrap(api.get(`/site/static/${slug}`)),
  faq: () => unwrap(api.get('/faq')),
  contact: () => unwrap(api.get('/site/contact')),
};
