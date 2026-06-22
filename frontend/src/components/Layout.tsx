import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { clearToken } from '../api/index';
import TimerStatus from './Timer';
import logo from '../logo_transparent.png';

const navItems = [
  { to: '/clients',      label: 'Clients' },
  { to: '/projects',     label: 'Projects' },
  { to: '/timesheets',   label: 'Timesheets' },
  { to: '/timer',        label: 'Timer' },
  { to: '/estimates',    label: 'Estimates' },
  { to: '/invoices',     label: 'Invoices' },
  { to: '/charge-codes', label: 'Charge Codes' },
  { to: '/settings',     label: 'Settings' },
];

export default function Layout() {
  const navigate = useNavigate();

  function handleLogout() {
    clearToken();
    navigate('/login');
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-56 bg-gray-900 text-white flex flex-col shrink-0">
        <div className="px-4 py-4 border-b border-gray-700">
          <img src={logo} alt="Solo" className="h-8 w-auto mx-auto" />
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-gray-700 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <TimerStatus />
        <div className="px-3 py-4 border-t border-gray-700">
          <button
            onClick={handleLogout}
            className="w-full text-left px-3 py-2 rounded-md text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
