import { Link, NavLink } from 'react-router-dom';
import { useApp } from '@/context/AppContext';

export function Navigation() {
  const { t, theme, toggleTheme } = useApp();
  const isDark = theme === 'dark';

  return (
    <nav className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--navbar)] text-[var(--text)] backdrop-blur transition-colors">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-8">
            <Link
              to="/"
              className="light-text-strong flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-[var(--text)]"
            >
              Yetkazib berish nazorati
            </Link>
            <div className="hidden gap-1 md:flex">
              <NavigationLink to="/" label={t('dashboard')} end />
              <NavigationLink to="/clients" label={t('clients')} />
              <NavigationLink to="/factories" label={t('factories')} />
              <NavigationLink to="/deliveries" label={t('deliveries')} />
              <NavigationLink to="/reminders" label={t('reminders')} />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? "Yorug' rejimga o'tish" : "Qorong'i rejimga o'tish"}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card)] text-gray-700 shadow-sm transition-colors hover:bg-[var(--card-hover)] dark:text-[var(--text)]"
            >
              {isDark ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>
        </div>

        <div className="flex gap-1 overflow-x-auto pb-4 md:hidden">
          <NavigationLink to="/" label={t('dashboard')} end />
          <NavigationLink to="/clients" label={t('clients')} />
          <NavigationLink to="/factories" label={t('factories')} />
          <NavigationLink to="/deliveries" label={t('deliveries')} />
          <NavigationLink to="/reminders" label={t('reminders')} />
        </div>
      </div>
    </nav>
  );
}

function NavigationLink({
  to,
  label,
  end = false,
}: {
  to: string;
  label: string;
  end?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        [
          'rounded-md px-3 py-2 text-sm font-medium transition-colors',
          isActive
            ? 'light-nav-active bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200'
            : 'light-nav-link text-gray-700 hover:bg-[var(--ghost-hover)] hover:text-gray-900 dark:text-[var(--soft-text)] dark:hover:text-[var(--text)]',
        ].join(' ')
      }
    >
      {label}
    </NavLink>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="1.8">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2.5M12 19v2.5M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M2.5 12H5M19 12h2.5M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="1.8">
      <path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2Z" />
    </svg>
  );
}
