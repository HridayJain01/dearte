import { Heart, Menu, Search, ShoppingBag, User, MessageCircleMore, Instagram, Linkedin, Facebook } from 'lucide-react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
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
        className={`sticky top-0 z-50 transition duration-300 ${scrolled ? 'border-b border-[var(--color-border)] bg-[var(--color-inner-bg)]' : 'border-transparent bg-transparent'}`}
      >
        <div className="page-shell flex items-center justify-between gap-4 py-5">
          <Link to="/" className="flex items-center gap-3">
            <div className="text-center">
              <p className="lux-heading text-2xl tracking-widest text-[var(--color-heading)]">De Arté</p>
              <p className="font-['Jost'] text-[9px] uppercase tracking-[0.3em] text-[var(--color-muted)]">Jewels</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 lg:flex">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `text-[13px] font-medium uppercase tracking-[0.1em] transition ${isActive ? 'text-[var(--color-heading)] underline decoration-[var(--color-rose-petal)] underline-offset-4' : 'text-[var(--color-body)] hover:text-[var(--color-heading)] hover:underline hover:decoration-[var(--color-rose-petal)] hover:underline-offset-4'}`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <button className="hidden p-2 text-[var(--color-heading)] transition hover:text-[var(--color-rose-petal)] md:inline-flex">
              <Search className="h-5 w-5" />
            </button>
            <button onClick={() => navigate('/wishlist')} className="relative p-2 text-[var(--color-heading)] transition hover:text-[var(--color-rose-petal)]">
              <Heart className="h-5 w-5" />
              {wishlist.items?.length ? <span className="absolute -right-1 -top-1 rounded-full bg-[var(--color-rose-petal)] px-1.5 py-0.5 text-[10px] text-white">{wishlist.items.length}</span> : null}
            </button>
            <button onClick={() => navigate('/cart')} className="relative p-2 text-[var(--color-heading)] transition hover:text-[var(--color-rose-petal)]">
              <ShoppingBag className="h-5 w-5" />
              {cart.items?.length ? <span className="absolute -right-1 -top-1 rounded-full bg-[var(--color-rose-petal)] px-1.5 py-0.5 text-[10px] text-white">{cart.items.length}</span> : null}
            </button>
            {isAuthenticated ? (
              <button
                onClick={() => navigate(user.role === 'admin' ? '/admin/dashboard' : '/profile')}
                className="hidden rounded-full border border-white/10 px-4 py-3 text-sm md:inline-flex"
              >
                <User className="mr-2 h-4 w-4" />
                {user.name.split(' ')[0]}
              </button>
            ) : (
              <Button variant="secondary" className="hidden md:inline-flex" onClick={() => navigate('/login')}>
                Sign In
              </Button>
            )}
            {isAuthenticated ? (
              <button onClick={logout} className="hidden text-xs text-[var(--color-muted)] transition hover:text-[var(--color-heading)] md:inline-flex">
                Logout
              </button>
            ) : null}
            <button className="p-2 text-[var(--color-heading)] lg:hidden" onClick={() => setMenuOpen((value) => !value)}>
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>

        {menuOpen ? (
          <div className="page-shell flex flex-col gap-4 border-t border-[var(--color-border)] bg-[var(--color-primary-bg)] py-4 lg:hidden">
            {NAV_LINKS.map((link) => (
              <NavLink key={link.to} to={link.to} onClick={() => setMenuOpen(false)}>
                {link.label}
              </NavLink>
            ))}
          </div>
        ) : null}
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="border-t border-[var(--color-border)] bg-[var(--color-body)] text-[var(--color-primary-bg)] py-14">
        <div className="page-shell grid gap-10 lg:grid-cols-[1.1fr_0.7fr_0.7fr_1fr]">
          <div>
            <p className="lux-label mb-4 !text-[var(--color-hover-tint)]">De Arté Jewels</p>
            <h3 className="lux-heading text-4xl !text-white">Fine jewellery, consciously crafted.</h3>
            <p className="mt-4 max-w-md text-sm text-[var(--color-border)]">
              Discover pieces meant to be lived in, combining modern values with timeless aesthetics.
            </p>
          </div>

          <div>
            <p className="lux-label mb-4 !text-[var(--color-hover-tint)]">Explore</p>
            <div className="space-y-3 text-sm text-[var(--color-border)]">
              {TRUST_LINKS.map((item) => (
                <Link key={item.to} to={item.to} className="block hover:text-[var(--color-rose-petal)]">
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <p className="lux-label mb-4 !text-[var(--color-hover-tint)]">Connect</p>
            <div className="space-y-3 text-sm text-[var(--color-border)]">
              <p>concierge@deartejewels.com</p>
              <p>+91 98765 43210</p>
              <p>Opera House, Mumbai</p>
              <div className="flex gap-3 pt-2 text-[var(--color-primary-bg)]">
                <a href="https://instagram.com" className="hover:text-[var(--color-rose-petal)]"><Instagram className="h-5 w-5" /></a>
                <a href="https://linkedin.com" className="hover:text-[var(--color-rose-petal)]"><Linkedin className="h-5 w-5" /></a>
                <a href="https://facebook.com" className="hover:text-[var(--color-rose-petal)]"><Facebook className="h-5 w-5" /></a>
              </div>
            </div>
          </div>

          <div className="border border-[var(--color-border)] bg-[#4A3C3C] p-6 rounded-2xl">
            <p className="lux-label mb-3 !text-[var(--color-hover-tint)]">Newsletter</p>
            <p className="text-sm text-[var(--color-border)]">Sign up for early access to our exclusive collections.</p>
            <div className="mt-4 flex flex-col gap-3">
              <input className="rounded-full border border-[var(--color-border)] bg-transparent px-4 py-3 placeholder:text-[var(--color-border)] text-white focus:outline-none focus:border-[var(--color-rose-petal)]" placeholder="Email address" />
              <Button variant="primary">Subscribe</Button>
            </div>
          </div>
        </div>
      </footer>

      <a
        href="https://wa.me/919876543210"
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-6 right-6 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-rose-petal)] text-white shadow-xl hover:bg-[var(--color-dusty-rose)] transition"
      >
        <MessageCircleMore className="h-6 w-6" />
      </a>
    </div>
  );
}
