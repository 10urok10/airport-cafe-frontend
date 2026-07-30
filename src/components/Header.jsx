import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_LINKS = [
  { to: '/orders', label: 'Siparis Al' },
  { to: '/kitchen', label: 'Mutfak' },
  { to: '/inventory', label: 'Envanter' },
  { to: '/products', label: 'Urunler', adminOnly: true },
  { to: '/reports', label: 'Raporlar', adminOnly: true },
];

export default function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="flex items-center justify-between bg-white px-6 py-3 shadow-sm">
      <div className="flex items-center gap-8">
        <h1 className="text-xl font-bold text-slate-800">Airport Cafe</h1>
        <nav className="flex gap-2">
          {NAV_LINKS.filter((link) => !link.adminOnly || user?.role === 'ADMIN').map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `rounded-lg px-4 py-2 text-lg font-semibold transition ${
                  isActive ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-slate-600">
          {user?.name} <span className="text-slate-400">({user?.role})</span>
        </span>
        <button
          onClick={logout}
          className="rounded-lg bg-slate-100 px-4 py-2 font-medium text-slate-600 hover:bg-slate-200"
        >
          Cikis Yap
        </button>
      </div>
    </header>
  );
}
