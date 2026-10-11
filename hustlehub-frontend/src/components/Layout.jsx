// Page frame shared by every route: skip link, top bar, content and footer.

import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

export default function Layout() {
  return (
    <>
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
