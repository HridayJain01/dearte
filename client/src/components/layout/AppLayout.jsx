import { ChevronDown, Heart, Menu, Search, ShoppingBag, User, MessageCircleMore } from 'lucide-react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { EDUCATION_ROUTES, NAV_LINKS, TRUST_LINKS } from '../../utils/constants';
import { useCollections, useNavCategories, useOccasions } from '../../hooks/useProducts';
import { brandLogoAlt, brandLogoUrl } from '../../utils/brandLogo';
import { useAuth } from '../../hooks/useAuth';
import { useCart } from '../../hooks/useCart';
import { useWishlist } from '../../hooks/useWishlist';
import { Button } from '../ui/Primitives';
import { productService } from '../../services/productService';

// Admin-managed site settings. Same query key as ContactPage so the two share
// one cached fetch. Falls back to the shipped defaults for any blank field.
function useSiteSettings() {
  const { data } = useQuery({ queryKey: ['contact'], queryFn: productService.contact, staleTime: 5 * 60 * 1000 });
  return data || {};
}

// Admin may store the WhatsApp number as digits or as a full link.
function whatsappHref(value) {
  if (!value) return 'https://wa.me/919876543210';
  if (/^https?:\/\//i.test(value)) return value;
  return `https://wa.me/${value.replace(/\D/g, '')}`;
}

// Single source of truth for nav typography so the desktop links, the Occasions
// button, its dropdown items and the mobile menu all render identically.
const NAV_TEXT = 'text-[13px] font-medium uppercase tracking-[0.1em]';

// Header icon rail. 40px on mobile still clears the tap-target floor while
// leaving room for the Sign In button on a narrow screen.
const ICON_BUTTON =
  'flex h-10 w-10 items-center justify-center text-[var(--color-text)] transition hover:text-[var(--color-primary)] sm:h-11 sm:w-11';

const navLinkClass = ({ isActive }) =>
  `${NAV_TEXT} transition ${isActive ? 'text-[var(--color-primary)] underline decoration-[var(--color-accent)] underline-offset-4' : 'text-[var(--color-text)] hover:text-[var(--color-primary)]'}`;

// Desktop nav item that links to its landing page and reveals a quick-pick
// dropdown on hover (Occasions, Collections). Items are fetched rather than
// hardcoded so newly added ones show up without a code change.
function QuickNavMenu({ label, to, items }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // The label always links to the landing page. When items exist we
  // additionally reveal a quick-pick dropdown on hover so buyers can jump
  // straight to a filtered view without leaving the current page.
  if (!items.length) {
    return (
      <NavLink to={to} className={navLinkClass}>
        {label}
      </NavLink>
    );
  }

  return (
    // NAV_TEXT sits on the wrapper so the link matches the other nav items.
    <div
      ref={wrapRef}
      className={`${NAV_TEXT} relative`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <NavLink
        to={to}
        aria-expanded={open}
        aria-haspopup="true"
        className={navLinkClass}
      >
        {label}
      </NavLink>
      {open ? (
        <div className="absolute left-0 top-full z-40 max-h-[70vh] min-w-[200px] overflow-auto border border-[var(--color-border)] bg-[var(--color-surface)] py-2 shadow-lg">
          {items.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              onClick={() => setOpen(false)}
              className={`${NAV_TEXT} block px-4 py-2 text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-primary)]`}
            >
              {item.name}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

// The product list reads both params off the URL, so a menu pick lands on a
// pre-filtered page (see ProductListPage).
const categoryHref = (category) => `/products?category=${encodeURIComponent(category)}`;
const subCategoryHref = (category, subCategory) =>
  `${categoryHref(category)}&subCategory=${encodeURIComponent(subCategory)}`;

// Desktop "Products" nav item: hovering reveals the full category list, and
// hovering a category swaps the second pane to that category's sub categories.
// Categories are fetched so newly added ones need no code change.
function CategoryNavMenu({ label, to, categories }) {
  const [open, setOpen] = useState(false);
  // Which category the second pane is showing; null falls back to the first.
  const [activeId, setActiveId] = useState(null);
  const wrapRef = useRef(null);

  const close = () => {
    setOpen(false);
    setActiveId(null);
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) close();
    }
    function handleEscape(event) {
      if (event.key === 'Escape') close();
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  // Before the categories land (or for a buyer granted nothing) the label stays
  // a plain link rather than an empty dropdown.
  if (!categories.length) {
    return (
      <NavLink to={to} className={navLinkClass}>
        {label}
      </NavLink>
    );
  }

  const activeCategory = categories.find((item) => item.id === activeId) || categories[0];
  const subCategories = activeCategory.subCategories || [];

  return (
    <div
      ref={wrapRef}
      className={`${NAV_TEXT} relative`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={close}
    >
      <NavLink to={to} aria-expanded={open} aria-haspopup="true" className={navLinkClass}>
        {label}
      </NavLink>
      {open ? (
        <div className="absolute left-0 top-full z-40 flex border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg">
          <div className="max-h-[70vh] min-w-[230px] overflow-auto py-2">
            <Link
              to={to}
              onClick={close}
              className={`${NAV_TEXT} block px-4 py-2 text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-primary)]`}
            >
              All Products
            </Link>
            {categories.map((category) => (
              <Link
                key={category.id}
                to={categoryHref(category.name)}
                onClick={close}
                onMouseEnter={() => setActiveId(category.id)}
                onFocus={() => setActiveId(category.id)}
                className={`${NAV_TEXT} block px-4 py-2 hover:bg-[var(--color-surface-alt)] ${
                  category.id === activeCategory.id
                    ? 'bg-[var(--color-surface-alt)] text-[var(--color-primary)]'
                    : 'text-[var(--color-text)] hover:text-[var(--color-primary)]'
                }`}
              >
                {category.name}
              </Link>
            ))}
          </div>
          {subCategories.length ? (
            <div className="max-h-[70vh] min-w-[240px] overflow-auto border-l border-[var(--color-border)] py-2">
              <p className="lux-label px-4 py-2 !text-[var(--color-text-muted)]">
                {activeCategory.name}
              </p>
              <Link
                to={categoryHref(activeCategory.name)}
                onClick={close}
                className={`${NAV_TEXT} block px-4 py-2 text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-primary)]`}
              >
                All {activeCategory.name}
              </Link>
              {subCategories.map((subCategory) => (
                <Link
                  key={subCategory}
                  to={subCategoryHref(activeCategory.name, subCategory)}
                  onClick={close}
                  className={`${NAV_TEXT} block px-4 py-2 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-primary)]`}
                >
                  {subCategory}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

// One type treatment for every level of the burger menu. Depth is carried by
// indentation and colour alone — shrinking and greying each level made the
// deeper rows wash out against the pale background.
const MOBILE_NAV_TEXT = 'font-sans text-[12px] font-medium uppercase tracking-[0.1em] leading-none';
const MOBILE_MENU_ACTION =
  'min-h-9 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.08em] transition';

// Rows sit on the white sheet, so full-strength text throughout; only the open
// parent shifts to the brand colour to mark where you are in the tree.
const rowTone = (depth) =>
  depth === 0 ? 'text-[var(--color-text)]' : 'text-[var(--color-text)]/85';

// A collapsible level of the burger menu. Tapping the row opens the level below
// instead of navigating — every branch leads with an "All ..." link, so the
// parent page stays one tap away.
function MobileAccordion({ label, depth = 0, children }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={`flex min-h-10 w-full items-center justify-between gap-2 py-2 text-left transition ${MOBILE_NAV_TEXT} ${
          open ? 'text-[var(--color-primary)]' : rowTone(depth)
        }`}
      >
        <span className="min-w-0 truncate">{label}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 transition duration-300 ${
            open ? 'rotate-180 text-[var(--color-accent)]' : 'text-[var(--color-text-muted)]'
          }`}
        />
      </button>
      {open ? (
        // A gold rule and a tinted inset separate the open branch from its
        // siblings without adding another border colour to the palette.
        <div className="mb-1 flex flex-col border-l border-[var(--color-accent)]/45 bg-[var(--color-surface-alt)]/60 pl-3">
          {children}
        </div>
      ) : null}
    </div>
  );
}

// Leaf row of the burger menu.
function MobileNavItem({ to, onNavigate, depth = 0, children }) {
  return (
    <Link
      to={to}
      onClick={onNavigate}
      className={`flex min-h-9 items-center py-2 transition hover:text-[var(--color-primary)] ${MOBILE_NAV_TEXT} ${rowTone(
        depth,
      )}`}
    >
      {children}
    </Link>
  );
}

// Mobile counterpart of CategoryNavMenu: a two-level accordion inside the
// burger menu, since there is no hover to open a flyout with.
function CategoryMobileMenu({ label, to, categories, onNavigate }) {
  if (!categories.length) {
    return (
      <MobileNavItem to={to} onNavigate={onNavigate}>
        {label}
      </MobileNavItem>
    );
  }

  return (
    <MobileAccordion label={label}>
      <MobileNavItem to={to} onNavigate={onNavigate} depth={1}>
        All {label}
      </MobileNavItem>
      {categories.map((category) => {
        const subCategories = category.subCategories || [];

        if (!subCategories.length) {
          return (
            <MobileNavItem
              key={category.id}
              to={categoryHref(category.name)}
              onNavigate={onNavigate}
              depth={1}
            >
              {category.name}
            </MobileNavItem>
          );
        }

        return (
          <MobileAccordion key={category.id} label={category.name} depth={1}>
            <MobileNavItem to={categoryHref(category.name)} onNavigate={onNavigate} depth={2}>
              All {category.name}
            </MobileNavItem>
            {subCategories.map((subCategory) => (
              <MobileNavItem
                key={subCategory}
                to={subCategoryHref(category.name, subCategory)}
                onNavigate={onNavigate}
                depth={2}
              >
                {subCategory}
              </MobileNavItem>
            ))}
          </MobileAccordion>
        );
      })}
    </MobileAccordion>
  );
}

export function AppLayout() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const { cart } = useCart();
  const { wishlist } = useWishlist();
  const { data: occasions } = useOccasions();
  const { data: navCategories } = useNavCategories();
  // /collections is buyer-only, so guests would just 401 in a loop.
  const { data: collections } = useCollections({ enabled: isAuthenticated });
  const settings = useSiteSettings();
  const categoryList = navCategories || [];
  const quickMenuItems = (link) => {
    if (link.occasionMenu) {
      return (occasions || []).map((occasion) => ({
        name: occasion.name,
        href: `/products?occasion=${encodeURIComponent(occasion.name)}`,
      }));
    }
    if (link.collectionMenu) {
      return (collections || []).map((collection) => ({
        name: collection.name,
        href: `/products?collection=${encodeURIComponent(collection.name)}`,
      }));
    }
    return null;
  };
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="relative">
      <header
        // An open menu opts the bar into the same white surface as the sheet, so
        // the two read as one panel instead of a floating list under a see-through bar.
        className={`sticky top-0 z-50 transition duration-300 ${scrolled || menuOpen ? 'border-b border-border bg-[var(--color-surface)]' : 'border-transparent bg-transparent'}`}
      >
        <div className="page-shell flex items-center justify-between gap-2 py-2 sm:gap-4 sm:py-5">
          <Link to="/" className="flex items-center gap-3">
            {/* Site header: always above the fold, so never deferred. */}
            <img src={brandLogoUrl} alt={brandLogoAlt} className="h-8 w-auto sm:h-12" loading="eager" decoding="async" />
          </Link>

          <nav className="hidden items-center gap-6 lg:flex">
            {NAV_LINKS.map((link) => {
              const quickItems = quickMenuItems(link);
              if (quickItems) {
                return <QuickNavMenu key={link.label} label={link.label} to={link.to} items={quickItems} />;
              }
              if (link.categoryMenu) {
                return (
                  <CategoryNavMenu
                    key={link.label}
                    label={link.label}
                    to={link.to}
                    categories={categoryList}
                  />
                );
              }
              return (
                <NavLink key={link.to} to={link.to} className={navLinkClass}>
                  {link.label}
                </NavLink>
              );
            })}
          </nav>

          <div className="flex items-center gap-0.5 sm:gap-3">
            <button
              onClick={() => {
                navigate('/products');
                // The products page owns the search box; focus it once it mounts.
                setTimeout(() => document.getElementById('product-search')?.focus(), 150);
              }}
              aria-label="Search products"
              className={ICON_BUTTON}
            >
              <Search className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
            </button>
            <button onClick={() => navigate('/wishlist')} className={`relative ${ICON_BUTTON}`}>
              <Heart className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
              {wishlist.items?.length ? <span className="absolute right-0 top-0 bg-[var(--color-primary)] px-1 py-px text-[9px] leading-tight text-white sm:-right-1 sm:-top-1 sm:px-1.5 sm:py-0.5 sm:text-[10px]">{wishlist.items.length}</span> : null}
            </button>
            <button onClick={() => navigate('/cart')} className={`relative ${ICON_BUTTON}`}>
              <ShoppingBag className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
              {cart.items?.length ? <span className="absolute right-0 top-0 bg-[var(--color-primary)] px-1 py-px text-[9px] leading-tight text-white sm:-right-1 sm:-top-1 sm:px-1.5 sm:py-0.5 sm:text-[10px]">{cart.items.length}</span> : null}
            </button>
            {isAuthenticated ? (
              <button
                onClick={() => navigate(user.role === 'admin' ? '/admin/dashboard' : '/profile')}
                className="hidden border border-[var(--color-border)] px-4 py-3 text-sm text-[var(--color-text)] hover:border-[var(--color-primary)] md:inline-flex"
              >
                <User className="mr-2 h-4 w-4" />
                {user.name.split(' ')[0]}
              </button>
            ) : (
              // Compact enough to sit on one line beside the icon rail on a
              // 360px screen; the burger menu carries the fuller Sign In /
              // Register pair.
              <Button
                variant="ghost"
                className="ml-0.5 shrink-0 px-2 text-[10px] sm:ml-0 sm:px-5 sm:text-[13px]"
                onClick={() => navigate('/login')}
              >
                Sign In
              </Button>
            )}
            {isAuthenticated ? (
              <button onClick={logout} className="hidden text-xs text-[var(--color-text-muted)] transition hover:text-[var(--color-primary)] md:inline-flex">
                Logout
              </button>
            ) : null}
            <button
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              className={`${ICON_BUTTON} lg:hidden`}
              onClick={() => setMenuOpen((value) => !value)}
            >
              <Menu className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
            </button>
          </div>
        </div>

        {menuOpen ? (
          // The sheet reads as its own surface: white against the pale pink page
          // (they were previously the same token, so the open menu vanished into
          // the content behind it), edged in gold and lifted off the content.
          // Capped and scrollable, since an expanded category tree is taller
          // than the viewport and the page behind it should not scroll.
          <div className="safe-bottom-pad flex max-h-[calc(100svh-3.5rem)] flex-col divide-y divide-[var(--color-border)]/70 overflow-y-auto border-t border-[var(--color-accent)]/40 bg-[var(--color-surface)] px-5 py-1 shadow-[var(--shadow-lifted)] lg:hidden">
            {NAV_LINKS.map((link) => {
              const quickItems = quickMenuItems(link);

              if (link.categoryMenu) {
                return (
                  <CategoryMobileMenu
                    key={link.label}
                    label={link.label}
                    to={link.to}
                    categories={categoryList}
                    onNavigate={() => setMenuOpen(false)}
                  />
                );
              }

              if (quickItems?.length) {
                return (
                  <MobileAccordion key={link.label} label={link.label}>
                    <MobileNavItem to={link.to} onNavigate={() => setMenuOpen(false)} depth={1}>
                      All {link.label}
                    </MobileNavItem>
                    {quickItems.map((item) => (
                      <MobileNavItem
                        key={item.name}
                        to={item.href}
                        onNavigate={() => setMenuOpen(false)}
                        depth={1}
                      >
                        {item.name}
                      </MobileNavItem>
                    ))}
                  </MobileAccordion>
                );
              }

              return (
                <MobileNavItem key={link.to} to={link.to} onNavigate={() => setMenuOpen(false)}>
                  {link.label}
                </MobileNavItem>
              );
            })}

            {/* Filled + outlined rather than two identical outlines, so the
                primary action reads first. */}
            <div className="grid grid-cols-2 gap-2 py-3">
              {isAuthenticated ? (
                <>
                  <button
                    onClick={() => {
                      navigate(user.role === 'admin' ? '/admin/dashboard' : '/profile');
                      setMenuOpen(false);
                    }}
                    className={`${MOBILE_MENU_ACTION} bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]`}
                  >
                    My Account
                  </button>
                  <button
                    onClick={() => {
                      logout();
                      setMenuOpen(false);
                    }}
                    className={`${MOBILE_MENU_ACTION} border border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]`}
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      navigate('/login');
                      setMenuOpen(false);
                    }}
                    className={`${MOBILE_MENU_ACTION} bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]`}
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => {
                      navigate('/register');
                      setMenuOpen(false);
                    }}
                    className={`${MOBILE_MENU_ACTION} border border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]`}
                  >
                    Register
                  </button>
                </>
              )}
            </div>
          </div>
        ) : null}
      </header>

      <main>
        <div key={location.pathname} className="animate-page-enter">
          <Outlet />
        </div>
      </main>

      {/* Mobile lays the four blocks out as a 2-column grid — brand and
          newsletter span both, Explore and Connect sit side by side — so the
          footer reads as a block instead of one very long scroll. */}
      <footer className="safe-bottom-pad border-t border-[var(--color-border)] bg-[var(--color-primary)] py-6 text-white sm:py-14">
        {/* The trailing padding sits on the grid, not the footer: .safe-bottom-pad
            is unlayered CSS and would win over a padding utility here. It keeps
            the last row clear of the fixed WhatsApp button at the end of the page. */}
        <div className="page-shell grid grid-cols-2 gap-x-4 gap-y-5 pb-10 sm:gap-10 sm:pb-0 lg:grid-cols-[1fr_0.65fr_0.65fr_0.8fr_1fr]">
          <div className="col-span-2 lg:col-span-1">
            <img src={brandLogoUrl} alt={brandLogoAlt} className="h-8 w-auto bg-white/95 p-1.5 sm:h-10 sm:p-2" loading="lazy" decoding="async" />
            <h3 className="lux-heading mt-2 text-lg !text-white sm:mt-0 sm:text-4xl">Fine jewellery, consciously crafted.</h3>
            <p className="mt-2 max-w-md text-[11px] leading-relaxed text-white/60 sm:mt-4 sm:text-sm">
              Discover pieces meant to be lived in, combining modern values with timeless aesthetics.
            </p>
          </div>

          <div>
            <p className="lux-label mb-2 !text-[var(--color-accent)] text-[10px] sm:mb-4 sm:text-xs">Explore</p>
            <div className="space-y-1.5 text-[11px] text-white/60 sm:space-y-3 sm:text-sm">
              {TRUST_LINKS.map((item) => (
                <Link key={item.to} to={item.to} className="block hover:text-white">
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {/* The education guides answer the questions buyers actually type into
              a search box, but nothing linked to them — they were reachable only
              by typing the URL. A crawler treats a page with no inbound links as
              barely worth ranking, however good it is. */}
          <div>
            <p className="lux-label mb-2 !text-[var(--color-accent)] text-[10px] sm:mb-4 sm:text-xs">Guides</p>
            <div className="space-y-1.5 text-[11px] text-white/60 sm:space-y-3 sm:text-sm">
              {EDUCATION_ROUTES.map((item) => (
                <Link key={item.slug} to={`/education/${item.slug}`} className="block hover:text-white">
                  {item.title}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <p className="lux-label mb-2 !text-[var(--color-accent)] text-[10px] sm:mb-4 sm:text-xs">Connect</p>
            <div className="space-y-1.5 text-[11px] text-white/60 sm:space-y-3 sm:text-sm">
              <p className="break-words">{settings.email || 'concierge@deartejewels.com'}</p>
              <p>{settings.phone || '+91 98765 43210'}</p>
              <p>{settings.address || 'Opera House, Mumbai'}</p>
              <div className="flex gap-3 pt-1 text-white/80 sm:pt-2">
                <a href={settings.instagram || 'https://instagram.com'} className="inline-flex h-5 min-w-5 items-center justify-center text-[11px] tracking-[0.08em] hover:text-[var(--color-accent)] sm:text-xs">IG</a>
                <a href={settings.linkedin || 'https://linkedin.com'} className="inline-flex h-5 min-w-5 items-center justify-center text-[11px] tracking-[0.08em] hover:text-[var(--color-accent)] sm:text-xs">IN</a>
                <a href={settings.facebook || 'https://facebook.com'} className="inline-flex h-5 min-w-5 items-center justify-center text-[11px] tracking-[0.08em] hover:text-[var(--color-accent)] sm:text-xs">FB</a>
              </div>
            </div>
          </div>

          <div className="col-span-2 border border-white/15 bg-white/5 p-3 sm:p-6 lg:col-span-1">
            <p className="lux-label mb-1.5 !text-[var(--color-accent)] text-[10px] sm:mb-3 sm:text-xs">Newsletter</p>
            <p className="text-[11px] text-white/60 sm:text-sm">{settings.newsletterBlurb || 'Sign up for early access to our exclusive collections.'}</p>
            <div className="mt-2.5 flex gap-2 sm:mt-4 sm:flex-col sm:gap-3">
              <input className="min-w-0 flex-1 border border-white/20 bg-transparent px-2.5 py-1.5 text-[12px] text-white placeholder:text-white/40 focus:border-[var(--color-accent)] focus:outline-none sm:px-4 sm:py-3 sm:text-base" placeholder="Email address" />
              <Button variant="secondary" className="shrink-0">Subscribe</Button>
            </div>
          </div>
        </div>
      </footer>

      <a
        href={whatsappHref(settings.whatsapp)}
        target="_blank"
        rel="noreferrer"
        aria-label="Chat on WhatsApp"
        className="safe-bottom-offset fixed bottom-3 right-3 z-40 inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#25D366] text-white shadow-xl transition hover:bg-[#1aa34a] sm:bottom-6 sm:right-6 sm:h-14 sm:w-14"
      >
        <span className="sr-only">WhatsApp</span>
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true">
          <path d="M20.52 3.48A11.9 11.9 0 0012 0C5.372 0 .02 5.352.02 12.98c0 2.137.558 4.247 1.616 6.103L0 24l5.09-1.584A11.94 11.94 0 0012 24c6.628 0 12-5.372 12-12 0-3.206-1.246-6.216-3.48-8.52zM12 21.5c-1.548 0-3.07-.367-4.397-1.06l-.315-.173-3.02.94.9-2.947-.205-.315A9.006 9.006 0 013 12.98C3 7.47 7.47 3 12.98 3 18.49 3 23 7.47 23 12.98 23 18.49 18.53 22.98 12.98 22.98 12.99 22.98 12 21.5 12 21.5z" />
          <path d="M17.31 14.08c-.28-.14-1.66-.82-1.92-.91-.26-.09-.45-.14-.64.14-.19.28-.74.91-.91 1.09-.17.18-.34.2-.63.07-.28-.14-1.18-.43-2.25-1.39-.83-.74-1.39-1.66-1.55-1.94-.16-.28-.02-.43.12-.57.12-.12.28-.31.42-.47.14-.16.19-.28.28-.47.09-.19.04-.36-.02-.5-.06-.14-.64-1.54-.88-2.12-.23-.55-.47-.48-.64-.49-.17-.01-.37-.01-.57-.01-.19 0-.5.07-.76.36-.26.29-1 1-1 2.5s1.03 2.9 1.17 3.1c.14.19 2.02 3.05 4.9 4.28 1.64.71 2.24.75 3.04.63.48-.07 1.66-.68 1.9-1.34.24-.66.24-1.23.17-1.34-.07-.11-.26-.19-.54-.33z" />
        </svg>
      </a>
    </div>
  );
}
