import { Heart, Menu, Search, ShoppingBag, User, MessageCircleMore } from 'lucide-react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { NAV_LINKS, TRUST_LINKS } from '../../utils/constants';
import { useAuth } from '../../hooks/useAuth';
import { useCart } from '../../hooks/useCart';
import { useWishlist } from '../../hooks/useWishlist';
import { Button } from '../ui/Primitives';

export function AppLayout() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const { cart } = useCart();
  const { wishlist } = useWishlist();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="relative">
      <header
        className={`sticky top-0 z-50 transition duration-300 ${scrolled ? 'border-b border-border bg-[var(--color-surface)]' : 'border-transparent bg-transparent'}`}
      >
        <div className="page-shell flex items-center justify-between gap-3 py-3 sm:gap-4 sm:py-5">
          <Link to="/" className="flex items-center gap-3">
            <div className="text-center">
              <p className="lux-heading text-xl tracking-widest sm:text-2xl">De Arté</p>
              <p className="font-['Jost'] text-[9px] uppercase tracking-[0.3em] text-[var(--color-text-muted)]">Jewels</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 lg:flex">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `text-[13px] font-medium uppercase tracking-[0.1em] transition ${isActive ? 'text-[var(--color-primary)] underline decoration-[var(--color-accent)] underline-offset-4' : 'text-[var(--color-text)] hover:text-[var(--color-primary)]'}`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-1 sm:gap-3">
            <button className="hidden min-h-11 min-w-11 p-2 text-[var(--color-text)] transition hover:text-[var(--color-primary)] md:inline-flex">
              <Search className="h-5 w-5" />
            </button>
            <button onClick={() => navigate('/wishlist')} className="relative min-h-11 min-w-11 p-2 text-[var(--color-text)] transition hover:text-[var(--color-primary)]">
              <Heart className="h-5 w-5" />
              {wishlist.items?.length ? <span className="absolute -right-1 -top-1 bg-[var(--color-primary)] px-1.5 py-0.5 text-[10px] text-white">{wishlist.items.length}</span> : null}
            </button>
            <button onClick={() => navigate('/cart')} className="relative min-h-11 min-w-11 p-2 text-[var(--color-text)] transition hover:text-[var(--color-primary)]">
              <ShoppingBag className="h-5 w-5" />
              {cart.items?.length ? <span className="absolute -right-1 -top-1 bg-[var(--color-primary)] px-1.5 py-0.5 text-[10px] text-white">{cart.items.length}</span> : null}
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
              <Button variant="ghost" className="hidden md:inline-flex" onClick={() => navigate('/login')}>
                Sign In
              </Button>
            )}
            {isAuthenticated ? (
              <button onClick={logout} className="hidden text-xs text-[var(--color-text-muted)] transition hover:text-[var(--color-primary)] md:inline-flex">
                Logout
              </button>
            ) : null}
            <button className="min-h-11 min-w-11 p-2 text-[var(--color-text)] lg:hidden" onClick={() => setMenuOpen((value) => !value)}>
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>

        {menuOpen ? (
          <div className="safe-bottom-pad page-shell flex flex-col gap-4 border-t border-[var(--color-border)] bg-[var(--color-primary-bg)] py-4 lg:hidden">
            {NAV_LINKS.map((link) => (
              <NavLink key={link.to} to={link.to} onClick={() => setMenuOpen(false)} className="min-h-11 py-2 text-sm">
                {link.label}
              </NavLink>
            ))}

            <div className="mt-2 border-t border-[var(--color-border)] pt-3">
              {isAuthenticated ? (
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => {
                      navigate(user.role === 'admin' ? '/admin/dashboard' : '/profile');
                      setMenuOpen(false);
                    }}
                    className="min-h-11 border border-[var(--color-border)] px-4 py-2 text-left text-sm text-[var(--color-text)]"
                  >
                    My Account
                  </button>
                  <button
                    onClick={() => {
                      logout();
                      setMenuOpen(false);
                    }}
                    className="min-h-11 border border-[var(--color-border)] px-4 py-2 text-left text-sm text-[var(--color-text)]"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => {
                      navigate('/login');
                      setMenuOpen(false);
                    }}
                    className="min-h-11 border border-[var(--color-border)] px-4 py-2 text-left text-sm text-[var(--color-text)]"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => {
                      navigate('/register');
                      setMenuOpen(false);
                    }}
                    className="min-h-11 border border-[var(--color-border)] px-4 py-2 text-left text-sm text-[var(--color-text)]"
                  >
                    Register
                  </button>
                </div>
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

      <footer className="safe-bottom-pad border-t border-[var(--color-border)] bg-[var(--color-primary)] py-6 text-white sm:py-14">
        <div className="page-shell grid gap-5 sm:gap-10 lg:grid-cols-[1.1fr_0.7fr_0.7fr_1fr]">
          <div>
            <p className="lux-label mb-4 !text-[var(--color-accent)]">De Arté Jewels</p>
            <h3 className="lux-heading text-3xl !text-white sm:text-4xl">Fine jewellery, consciously crafted.</h3>
            <p className="mt-4 max-w-md text-sm text-white/60">
              Discover pieces meant to be lived in, combining modern values with timeless aesthetics.
            </p>
          </div>

          <div>
            <p className="lux-label mb-4 !text-[var(--color-accent)]">Explore</p>
            <div className="space-y-3 text-sm text-white/60">
              {TRUST_LINKS.map((item) => (
                <Link key={item.to} to={item.to} className="block hover:text-white">
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <p className="lux-label mb-4 !text-[var(--color-accent)]">Connect</p>
            <div className="space-y-3 text-sm text-white/60">
              <p>concierge@deartejewels.com</p>
              <p>+91 98765 43210</p>
              <p>Opera House, Mumbai</p>
              <div className="flex gap-3 pt-2 text-white/80">
                <a href="https://instagram.com" className="inline-flex h-5 min-w-5 items-center justify-center text-xs tracking-[0.08em] hover:text-[var(--color-accent)]">IG</a>
                <a href="https://linkedin.com" className="inline-flex h-5 min-w-5 items-center justify-center text-xs tracking-[0.08em] hover:text-[var(--color-accent)]">IN</a>
                <a href="https://facebook.com" className="inline-flex h-5 min-w-5 items-center justify-center text-xs tracking-[0.08em] hover:text-[var(--color-accent)]">FB</a>
              </div>
            </div>
          </div>

          <div className="border border-white/15 bg-white/5 p-4 sm:p-6">
            <p className="lux-label mb-3 !text-[var(--color-accent)]">Newsletter</p>
            <p className="text-sm text-white/60">Sign up for early access to our exclusive collections.</p>
            <div className="mt-4 flex flex-col gap-3">
              <input className="border border-white/20 bg-transparent px-4 py-3 placeholder:text-white/40 text-white focus:outline-none focus:border-[var(--color-accent)]" placeholder="Email address" />
              <Button variant="secondary">Subscribe</Button>
            </div>
          </div>
        </div>
      </footer>

      <a
        href="https://wa.me/919876543210"
        target="_blank"
        rel="noreferrer"
        aria-label="Chat on WhatsApp"
        className="safe-bottom-offset fixed bottom-4 right-4 z-40 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-xl transition hover:bg-[#1aa34a] sm:bottom-6 sm:right-6 sm:h-14 sm:w-14"
      >
        <span className="sr-only">WhatsApp</span>
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6" aria-hidden="true">
          <path d="M20.52 3.48A11.9 11.9 0 0012 0C5.372 0 .02 5.352.02 12.98c0 2.137.558 4.247 1.616 6.103L0 24l5.09-1.584A11.94 11.94 0 0012 24c6.628 0 12-5.372 12-12 0-3.206-1.246-6.216-3.48-8.52zM12 21.5c-1.548 0-3.07-.367-4.397-1.06l-.315-.173-3.02.94.9-2.947-.205-.315A9.006 9.006 0 013 12.98C3 7.47 7.47 3 12.98 3 18.49 3 23 7.47 23 12.98 23 18.49 18.53 22.98 12.98 22.98 12.99 22.98 12 21.5 12 21.5z" />
          <path d="M17.31 14.08c-.28-.14-1.66-.82-1.92-.91-.26-.09-.45-.14-.64.14-.19.28-.74.91-.91 1.09-.17.18-.34.2-.63.07-.28-.14-1.18-.43-2.25-1.39-.83-.74-1.39-1.66-1.55-1.94-.16-.28-.02-.43.12-.57.12-.12.28-.31.42-.47.14-.16.19-.28.28-.47.09-.19.04-.36-.02-.5-.06-.14-.64-1.54-.88-2.12-.23-.55-.47-.48-.64-.49-.17-.01-.37-.01-.57-.01-.19 0-.5.07-.76.36-.26.29-1 1-1 2.5s1.03 2.9 1.17 3.1c.14.19 2.02 3.05 4.9 4.28 1.64.71 2.24.75 3.04.63.48-.07 1.66-.68 1.9-1.34.24-.66.24-1.23.17-1.34-.07-.11-.26-.19-.54-.33z" />
        </svg>
      </a>
    </div>
  );
}
