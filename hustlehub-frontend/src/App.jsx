// Route table. ProtectedRoute decides who may open each page.

import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import AdminPage from './pages/AdminPage';
import BookingsPage from './pages/BookingsPage';
import GigDetailPage from './pages/GigDetailPage';
import GigEditorPage from './pages/GigEditorPage';
import GigsPage from './pages/GigsPage';
import IncomePage from './pages/IncomePage';
import LoginPage from './pages/LoginPage';
import MyGigsPage from './pages/MyGigsPage';
import NotFoundPage from './pages/NotFoundPage';
import PaymentsPage from './pages/PaymentsPage';
import RegisterPage from './pages/RegisterPage';
import { useAuth } from './context/AuthContext';
import { homeFor } from './utils/roleHome';

const guard = (element, roles) => <ProtectedRoute roles={roles}>{element}</ProtectedRoute>;

// "/" sends each logged-in role to its own home page.
function RoleHome() {
  const { user } = useAuth();
  return <Navigate to={homeFor(user?.role)} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={guard(<RoleHome />)} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route path="/gigs" element={guard(<GigsPage />)} />
        <Route path="/gigs/:id" element={guard(<GigDetailPage />)} />

        <Route path="/my-gigs" element={guard(<MyGigsPage />, ['freelancer'])} />
        <Route path="/my-gigs/new" element={guard(<GigEditorPage />, ['freelancer'])} />
        <Route path="/my-gigs/:id/edit" element={guard(<GigEditorPage />, ['freelancer'])} />

        <Route path="/bookings" element={guard(<BookingsPage />)} />
        <Route path="/payments" element={guard(<PaymentsPage />)} />
        <Route path="/income" element={guard(<IncomePage />, ['freelancer'])} />
        <Route path="/admin" element={guard(<AdminPage />, ['admin'])} />

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
