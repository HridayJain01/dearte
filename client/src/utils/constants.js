import {
  BookOpen,
  Briefcase,
  Building2,
  FileClock,
  Gem,
  Home,
  LayoutDashboard,
  MessageCircle,
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
  // Links to the full product list; AppLayout also adds a category dropdown on
  // hover with the category -> sub category tree from /api/nav/categories.
  { label: 'Products', to: '/products', categoryMenu: true },
  // Links to the collections landing page; AppLayout also adds a quick-pick
  // dropdown on hover with options from /api/collections.
  { label: 'Collections', to: '/collections', collectionMenu: true },
  // Links to the "Shop by Occasion" page; AppLayout also adds a quick-pick
  // dropdown on hover with options from /api/occasions.
  { label: 'Occasions', to: '/occasions', occasionMenu: true },
  { label: 'Best Sellers', to: '/products?sort=best-sellers' },
  { label: 'About Us', to: '/about' },
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
  { label: 'WhatsApp', to: '/admin/whatsapp', icon: MessageCircle },
  { label: 'Catalogues', to: '/admin/catalogues', icon: ScrollText },
  { label: 'Collections', to: '/admin/collections', icon: Gem },
  { label: 'Configuration', to: '/admin/config', icon: Settings },
  { label: 'Testimonials', to: '/admin/testimonials', icon: MessageSquareQuote },
  { label: 'Roles', to: '/admin/roles', icon: ShieldCheck },
  { label: 'Reports', to: '/admin/reports', icon: FileClock },
];

export const TRUST_LINKS = [
  { label: 'Contact Us', to: '/contact' },
  { label: 'FAQs', to: '/faq' },
  { label: 'Events', to: '/events' },
  { label: 'Testimonials', to: '/testimonials' },
  { label: 'Trusted By', to: '/trusted-by' },
  { label: 'Career', to: '/careers' },
  { label: 'Privacy Policy', to: '/privacy-policy' },
  { label: 'Terms & Conditions', to: '/terms' },
  { label: 'Return Policy', to: '/return-policy' },
];

export const SUPPORT_PAGES = [
  { icon: Home, title: 'Responsive B2B storefront', text: 'Built for wholesale discovery without pricing exposure.' },
  { icon: Building2, title: 'Private catalogue workflows', text: 'Role-aware buyer experiences and curated access.' },
  { icon: Briefcase, title: 'Trade-first operations', text: 'Admin-managed catalogues, approvals, and reporting surfaces.' },
];

/**
 * The house makes a single diamond quality, so it is displayed as a fixed
 * spec rather than offered as a choice anywhere in the storefront or admin.
 */
export const DIAMOND_QUALITY = 'VVS-VS EF';
