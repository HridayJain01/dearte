import { ExternalLink, LogOut, Menu, MoreHorizontal, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { ADMIN_LINKS } from '../../utils/constants';
import { brandLogoAlt, brandLogoUrl } from '../../utils/brandLogo';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/Primitives';

// Phone tab bar: the sections an admin opens on the go. Everything else is one
// tap away under "More", which opens the full menu.
const TAB_PATHS = ['/admin/dashboard', '/admin/products', '/admin/orders', '/admin/users'];
const TABS = TAB_PATHS.map((to) => ADMIN_LINKS.find((item) => item.to === to)).filter(Boolean);

function AdminNav({ onNavigate }) {
  return (
    <nav aria-label="Admin sections" className="grid gap-1">
      {ADMIN_LINKS.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex min-h-11 items-center gap-3 px-4 py-2.5 text-sm transition ${isActive ? 'border-l-2 border-primary bg-surface-alt font-medium text-primary' : 'text-text-muted hover:bg-surface-alt hover:text-text'}`
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            {item.label}
          </NavLink>
        );
      })}
    </nav>
  );
}

export function AdminLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const menuRef = useRef(null);
  const current = ADMIN_LINKS.find((item) => location.pathname.startsWith(item.to));

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    menuRef.current?.close();
  }, [location.pathname]);

  const brand = (
    <div>
      <p className="lux-label mb-2">Admin Console</p>
      <img src={brandLogoUrl} alt={brandLogoAlt} className="h-12 w-auto" />
      <p className="mt-2 truncate text-sm text-text-muted">{user?.name}</p>
    </div>
  );

  return (
    <div className="admin-shell min-h-screen bg-primary-bg text-text lg:grid lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="hidden border-r border-border bg-surface p-6 shadow-sm lg:sticky lg:top-0 lg:block lg:h-screen lg:self-start lg:overflow-y-auto">
        {brand}
        <div className="mt-6 border-t border-border pt-6">
          <AdminNav />
          <Button variant="ghost" className="mt-6 w-full" onClick={logout}>
            Logout
          </Button>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-surface/95 px-2 backdrop-blur lg:hidden">
        <button
          type="button"
          onClick={() => menuRef.current?.showModal()}
          aria-label="Open admin menu"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center text-primary"
        >
          <Menu className="h-5 w-5" />
        </button>
        <p className="min-w-0 flex-1 truncate font-serif text-xl text-primary">{current?.label || 'Admin'}</p>
        <Link to="/" aria-label="View the store" className="inline-flex h-11 w-11 shrink-0 items-center justify-center text-text-muted">
          <ExternalLink className="h-4 w-4" />
        </Link>
      </header>

      {/* Native modal dialog: focus trap, Escape and an inert page behind it for free.
          A click on the backdrop lands on the dialog element itself, which closes it. */}
      <dialog
        ref={menuRef}
        aria-label="Admin menu"
        onClick={(event) => event.target === event.currentTarget && event.currentTarget.close()}
        className="admin-drawer m-0 h-dvh max-h-none w-[min(20rem,86vw)] max-w-none overflow-y-auto border-r border-border bg-surface p-0 text-text backdrop:bg-black/40 lg:hidden"
      >
        <div className="flex min-h-full flex-col p-5">
          <div className="flex items-start justify-between gap-3">
            {brand}
            <button
              type="button"
              onClick={() => menuRef.current?.close()}
              aria-label="Close admin menu"
              className="-mr-2 -mt-2 inline-flex h-11 w-11 items-center justify-center text-text-muted"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-5 flex-1 border-t border-border pt-4">
            <AdminNav onNavigate={() => menuRef.current?.close()} />
          </div>
          <Button variant="ghost" icon={LogOut} className="mt-5 w-full" onClick={logout}>
            Logout
          </Button>
        </div>
      </dialog>

      <main className="min-w-0 px-3 pb-[calc(5.5rem_+_env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pt-6 md:px-8 md:pt-8 lg:pb-8">
        <Outlet />
      </main>

      <nav
        aria-label="Admin shortcuts"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        {TABS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] uppercase tracking-[0.08em] ${isActive ? 'text-primary' : 'text-text-muted'}`
              }
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          );
        })}
        <button
          type="button"
          onClick={() => menuRef.current?.showModal()}
          className={`flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] uppercase tracking-[0.08em] ${current && !TABS.includes(current) ? 'text-primary' : 'text-text-muted'}`}
        >
          <MoreHorizontal className="h-5 w-5" />
          More
        </button>
      </nav>
    </div>
  );
}
