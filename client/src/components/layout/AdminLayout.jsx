import { ChevronDown, Menu } from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { ADMIN_LINKS } from '../../utils/constants';
import { brandLogoAlt, brandLogoUrl } from '../../utils/brandLogo';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/Primitives';

export function AdminLayout() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-primary-bg text-text">
      <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
        <aside className="border-b border-border bg-surface p-4 shadow-sm sm:p-6 lg:sticky lg:top-0 lg:h-screen lg:self-start lg:overflow-y-auto lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="lux-label mb-2">Admin Console</p>
              <img src={brandLogoUrl} alt={brandLogoAlt} className="h-12 w-auto" />
              <p className="mt-2 text-sm text-text-muted">{user?.name}</p>
            </div>
            <button
              type="button"
              className="inline-flex min-h-11 items-center gap-2 border border-border px-3 py-2 text-sm text-text lg:hidden"
              onClick={() => setMenuOpen((current) => !current)}
              aria-expanded={menuOpen}
              aria-label="Toggle admin menu"
            >
              <Menu className="h-4 w-4" />
              Menu
              <ChevronDown className={`h-4 w-4 transition ${menuOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>

          <div className={`${menuOpen ? 'mt-4 block border-t border-border pt-5' : 'hidden'} lg:mt-6 lg:block lg:border-t lg:border-border lg:pt-6`}>
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-1">
              {ADMIN_LINKS.map((item) => {
                const Icon = item.icon;

                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-3 text-sm transition ${isActive ? 'bg-surface-alt text-primary font-medium border-l-2 border-primary' : 'text-text-muted hover:bg-surface-alt hover:text-text'}`
                    }
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </NavLink>
                );
              })}
            </div>

            <Button variant="ghost" className="mt-6 w-full" onClick={logout}>
              Logout
            </Button>
          </div>
        </aside>
        <main className="p-4 sm:p-6 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
