import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import Alert from '../components/Alert';
import DataState from '../components/DataState';
import GigForm from '../components/GigForm';
import PageHeader from '../components/PageHeader';
import { useApi } from '../hooks/useApi';

export default function GigEditorPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [serverErrors, setServerErrors] = useState({});

  const { data, error, loading } = useApi(() => (isEdit ? api.gigs.get(id) : Promise.resolve(null)), [id]);

  async function handleSubmit(values) {
    setSubmitting(true);
    setFormError('');
    setServerErrors({});
    try {
      if (isEdit) await api.gigs.update(id, values);
      else await api.gigs.create(values);
      navigate('/my-gigs');
    } catch (err) {
      setFormError(err.message);
      setServerErrors(err.fieldErrors || {});
    } finally {
      setSubmitting(false);
    }
  }

  const gig = data ? data.data : null;
  const initial = gig ? { title: gig.title, description: gig.description, category: gig.category, price: String(gig.price), deliveryDays: String(gig.deliveryDays), isActive: gig.isActive } : undefined;

  return (
    <>
      <PageHeader title={isEdit ? 'Edit gig' : 'Create a gig'} intro="Clients see this information when they browse." />
      {formError && <Alert variant="error">{formError}</Alert>}
      <DataState loading={loading} error={error} loadingLabel="Loading gig...">
        <GigForm initial={initial} submitLabel={isEdit ? 'Save changes' : 'Publish gig'} onSubmit={handleSubmit} submitting={submitting} serverErrors={serverErrors} />
      </DataState>
    </>
  );
}
