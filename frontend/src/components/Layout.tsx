import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { clearToken, isAdmin } from '../api/index';
import TimerStatus from './Timer';
import ImpersonationBanner from './ImpersonationBanner';
import logo from '../logo_transparent.png';

const navItems: ({ to: string; label: string } | null)[] = [
  { to: '/clients',      label: 'Clients' },
  { to: '/projects',     label: 'Projects' },
  { to: '/timesheets',   label: 'Timesheets' },
  { to: '/timer',        label: 'Timer' },
  { to: '/estimates',    label: 'Estimates' },
  { to: '/invoices',     label: 'Invoices' },
  { to: '/charge-codes', label: 'Charge Codes' },
  { to: '/settings',     label: 'Settings' },
  null, // divider
  { to: '/expenses',     label: 'Expenses' },
  { to: '/hst-returns',  label: 'HST Returns' },
  { to: '/cca',          label: 'CCA Schedule' },
  { to: '/home-office',  label: 'Home Office' },
  { to: '/t2125',        label: 'T2125 Report' },
];

const adminNavItems: ({ to: string; label: string } | null)[] = [
  null, // divider
  { to: '/admin/invitations', label: 'Invitations' },
  { to: '/admin/users',       label: 'Users' },
];

interface NavContentProps {
  items: ({ to: string; label: string } | null)[];
  onNavigate?: () => void;
  onLogout: () => void;
}

// Shared between the persistent desktop sidebar and the mobile slide-in drawer — one source of
// truth for nav content and structure, only the outer container differs between the two.
function NavContent({ items, onNavigate, onLogout }: NavContentProps) {
  return (
    <>
      <div className="px-4 py-4 border-b border-gray-700">
        <img src={logo} alt="Solo" className="h-8 w-auto mx-auto" />
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {items.map((item, i) =>
          item === null ? (
            <div key={`divider-${i}`} className="border-t border-gray-700 my-2" />
          ) : (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-gray-700 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              {item.label}
            </NavLink>
          )
        )}
      </nav>
      <TimerStatus />
      <div className="px-3 py-4 border-t border-gray-700">
        <button
          onClick={onLogout}
          className="w-full text-left px-3 py-2 rounded-md text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
        >
          Sign out
        </button>
      </div>
    </>
  );
}

export default function Layout() {
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const items = isAdmin() ? [...navItems, ...adminNavItems] : navItems;

  function handleLogout() {
    clearToken();
    navigate('/login');
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <ImpersonationBanner />

      {/* Mobile-only top bar with hamburger — hidden at lg+ where the persistent sidebar takes over */}
      <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-gray-900 text-white shrink-0">
        <button
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
          className="p-1 -ml-1 rounded-md hover:bg-gray-800 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <img src={logo} alt="Solo" className="h-6 w-auto" />
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Desktop sidebar — unchanged at lg+, not rendered at all below it */}
        <aside className="hidden lg:flex w-56 bg-gray-900 text-white flex-col shrink-0">
          <NavContent items={items} onLogout={handleLogout} />
        </aside>

        {/* Mobile drawer — overlay + slide-in panel, same nav content as the desktop sidebar */}
        {drawerOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setDrawerOpen(false)}
            />
            <aside className="relative w-64 max-w-[80vw] bg-gray-900 text-white flex flex-col shrink-0">
              <button
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
                className="absolute top-3 right-3 p-1 rounded-md text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <NavContent items={items} onNavigate={() => setDrawerOpen(false)} onLogout={handleLogout} />
            </aside>
          </div>
        )}

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
