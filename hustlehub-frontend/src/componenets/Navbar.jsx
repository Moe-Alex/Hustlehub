// Top bar. The links shown depend on the user's role.

import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const BROWSE = { to: '/gigs', label: 'Browse gigs' };

const LINKS_BY_ROLE = {
  client: [BROWSE, { to: '/bookings', label: 'My bookings' }, { to: '/payments', label: 'Payments' }],
  freelancer: [BROWSE, { to: '/my-gigs', label: 'My gigs' }, { to: '/bookings', label: 'Bookings received' }, { to: '/income', label: 'Income' }],
  admin: [BROWSE, { to: '/bookings', label: 'All bookings' }, { to: '/payments', label: 'Transactions' }, { to: '/admin', label: 'Admin' }],
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const links = user ? LINKS_BY_ROLE[user.role] || [BROWSE] : [];

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link to={user ? '/gigs' : '/login'} className="wordmark">
          HustleHub<span>+</span>
        </Link>

        <nav aria-label="Main" className="topbar-nav">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="topbar-user">
          {user ? (
            <>
              <span className="user-chip">
                {user.username} <small>{user.role}</small>
              </span>
              <button type="button" className="btn btn-ghost" onClick={handleLogout}>Log out</button>
            </>
          ) : (
            <>
              <Link className="btn btn-ghost" to="/login">Log in</Link>
              <Link className="btn btn-primary" to="/register">Create account</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
