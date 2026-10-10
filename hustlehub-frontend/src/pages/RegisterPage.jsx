import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import Alert from '../components/Alert';
import FormField from '../components/FormField';
import { useAuth } from '../context/AuthContext';
import { validateRegister } from '../utils/validators';

export default function RegisterPage() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState({ username: '', email: '', password: '', role: 'client' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/gigs" replace />;

  const update = (field) => (event) => setValues((previous) => ({ ...previous, [field]: event.target.value }));

  async function handleSubmit(event) {
    event.preventDefault();
    const found = validateRegister(values);
    setErrors(found);
    setFormError('');
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    try {
      await register({ username: values.username.trim(), email: values.email.trim(), password: values.password, role: values.role });
      navigate('/login', { state: { registered: true } });
    } catch (err) {
      setErrors(err.fieldErrors || {});
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="auth-panel">
      <h1>Create your account</h1>
      <p className="page-intro">Clients book services. Freelancers list them and track what they earn.</p>

      {formError && <Alert variant="error">{formError}</Alert>}

      <form className="form" onSubmit={handleSubmit} noValidate>
        <FormField id="username" label="Username" autoComplete="username" value={values.username} onChange={update('username')} error={errors.username} hint="3 to 30 letters, numbers or underscores." />
        <FormField id="email" label="Email address" type="email" autoComplete="email" value={values.email} onChange={update('email')} error={errors.email} />
        <FormField id="password" label="Password" type="password" autoComplete="new-password" value={values.password} onChange={update('password')} error={errors.password} hint="At least 8 characters with an uppercase letter, a lowercase letter, a number and a special character." />
        <FormField as="select" id="role" label="I want to" value={values.role} onChange={update('role')} error={errors.role}>
          <option value="client">Book freelancers (client)</option>
          <option value="freelancer">Offer my services (freelancer)</option>
        </FormField>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Creating account...' : 'Create account'}
        </button>
      </form>

      <p className="auth-switch">Already registered? <Link to="/login">Log in</Link></p>
    </section>
  );
}
