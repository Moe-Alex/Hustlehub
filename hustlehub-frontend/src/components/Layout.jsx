// Page frame shared by every route: skip link, top bar, content and footer.

import { Outlet } from 'react-router-dom';
import InactivityGuard from './InactivityGuard';
import Navbar from './Navbar';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user } = useAuth();
  return (
    <>
      {user && <InactivityGuard />}
      <a className="skip-link" href="#main">Skip to content</a>
      <Navbar />
      <main id="main" className="page">
        <Outlet />
      </main>
      <footer className="footer">
        <p>&copy; {new Date().getFullYear()} HustleHub+. All rights reserved.</p>
      </footer>
    </>
  );
}
