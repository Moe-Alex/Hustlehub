import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import Alert from '../components/Alert';
import FormField from '../components/FormField';
import { useAuth } from '../context/AuthContext';
import { homeFor } from '../utils/roleHome';
import { validateLogin } from '../utils/validators';

export default function LoginPage() {
  const { user, login, sessionMessage } = useAuth();
  const location = useLocation();
  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Already logged in (or just logged in): every role starts on its own home page.
  if (user) return <Navigate to={homeFor(user.role)} replace />;

  const update = (field) => (event) => setValues((previous) => ({ ...previous, [field]: event.target.value }));

  async function handleSubmit(event) {
    event.preventDefault();
    const found = validateLogin(values);
    setErrors(found);
    setFormError('');
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    try {
      await login(values.email.trim(), values.password);
    } catch (err) {
      setErrors(err.fieldErrors || {});
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="auth-panel">
      <h1>Log in</h1>
      <p className="page-intro">Welcome back. Log in to browse gigs, manage bookings and track your income.</p>

      {location.state?.registered && <Alert variant="success">Account created. Log in to continue.</Alert>}
      {sessionMessage && <Alert variant="info">{sessionMessage}</Alert>}
      {formError && <Alert variant="error">{formError}</Alert>}

      <form className="form" onSubmit={handleSubmit} noValidate>
        <FormField id="email" label="Email address" type="email" autoComplete="email" value={values.email} onChange={update('email')} error={errors.email} />
        <FormField id="password" label="Password" type="password" autoComplete="current-password" value={values.password} onChange={update('password')} error={errors.password} />
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Logging in...' : 'Log in'}
        </button>
      </form>

      <p className="auth-switch">New to HustleHub+? <Link to="/register">Create an account</Link></p>
    </section>
  );
}
