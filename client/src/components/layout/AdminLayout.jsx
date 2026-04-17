import { NavLink, Outlet } from 'react-router-dom';
import { ADMIN_LINKS } from '../../utils/constants';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/Primitives';

export function AdminLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-[var(--color-primary-bg)] text-[var(--color-text)]">
      <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
        <aside className="border-r border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
          <p className="lux-label mb-3">Admin Console</p>
          <h1 className="lux-heading text-4xl mt-3 tracking-widest">De Arté</h1>
          <p className="mt-3 text-sm text-[var(--color-text-muted)]">{user?.name}</p>
          <div className="mt-8 space-y-2">
            {ADMIN_LINKS.map((item) => {
              const Icon = item.icon;

              return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 text-sm transition ${isActive ? 'bg-[var(--color-surface-alt)] text-[var(--color-primary)] font-medium border-l-2 border-[var(--color-primary)]' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-text)]'}`
                }
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </NavLink>
              );
            })}
          </div>
          <Button variant="ghost" className="mt-8 w-full" onClick={logout}>
            Logout
          </Button>
        </aside>
        <main className="p-6 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
