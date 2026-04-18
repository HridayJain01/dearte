import {
  BookOpen,
  Briefcase,
  Building2,
  FileClock,
  Home,
  LayoutDashboard,
  MessageSquareQuote,
  Package,
  ScrollText,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Users,
} from 'lucide-react';

export const NAV_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'Collections', to: '/products' },
  { label: 'New Arrivals', to: '/products?sort=new-arrivals' },
  { label: 'Best Sellers', to: '/products?sort=best-sellers' },
  { label: 'Education', to: '/education/diamond' },
  { label: 'Contact', to: '/contact' },
];

export const EDUCATION_ROUTES = [
  { slug: 'diamond', title: 'Diamond Guide' },
  { slug: 'metals', title: 'Metals Guide' },
  { slug: 'ethical-sourcing', title: 'Ethical Sources' },
  { slug: 'size-guide', title: 'Size Guide' },
];

export const ADMIN_LINKS = [
  { label: 'Dashboard', to: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Promotions', to: '/admin/promotions', icon: Sparkles },
  { label: 'Users', to: '/admin/users', icon: Users },
  { label: 'Products', to: '/admin/products', icon: Package },
  { label: 'Orders', to: '/admin/orders', icon: ShoppingBag },
  { label: 'Catalogues', to: '/admin/catalogues', icon: ScrollText },
  { label: 'Configuration', to: '/admin/config', icon: Settings },
  { label: 'Testimonials', to: '/admin/testimonials', icon: MessageSquareQuote },
  { label: 'Roles', to: '/admin/roles', icon: ShieldCheck },
  { label: 'Reports', to: '/admin/reports', icon: FileClock },
];

export const TRUST_LINKS = [
  { label: 'Privacy Policy', to: '/privacy-policy' },
  { label: 'Terms & Conditions', to: '/terms' },
  { label: 'Return Policy', to: '/return-policy' },
  { label: 'FAQs', to: '/faq' },
  { label: 'Career', to: '/careers' },
  { label: 'Events', to: '/events' },
];

export const SUPPORT_PAGES = [
  { icon: Home, title: 'Responsive B2B storefront', text: 'Built for wholesale discovery without pricing exposure.' },
  { icon: Building2, title: 'Private catalogue workflows', text: 'Role-aware buyer experiences and curated access.' },
  { icon: Briefcase, title: 'Trade-first operations', text: 'Admin-managed catalogues, approvals, and reporting surfaces.' },
];
