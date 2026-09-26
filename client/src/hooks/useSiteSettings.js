import { useQuery } from '@tanstack/react-query';
import { productService } from '../services/productService';

// Admin-managed site settings. Same query key as ContactPage so the two share
// one cached fetch. Falls back to the shipped defaults for any blank field.
export function useSiteSettings() {
  const { data } = useQuery({ queryKey: ['contact'], queryFn: productService.contact, staleTime: 5 * 60 * 1000 });
  return data || {};
}

// Admin may store the WhatsApp number as digits or as a full link. No fallback
// number: a placeholder would route buyers' chats to a stranger's phone.
export function whatsappHref(value) {
  if (/^https?:\/\//i.test(value)) return value;
  return `https://wa.me/${value.replace(/\D/g, '')}`;
}
