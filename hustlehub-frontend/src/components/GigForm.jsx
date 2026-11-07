// Create / edit form for a gig. Checks the input first, and only submits when it is valid.

import { useState } from 'react';
import FormField from './FormField';
import { GIG_CATEGORIES, validateGig } from '../utils/validators';

const EMPTY = { title: '', description: '', category: '', price: '', deliveryDays: '', isActive: true };

export default function GigForm({ initial, submitLabel, onSubmit, submitting = false, serverErrors = {} }) {
  const [values, setValues] = useState({ ...EMPTY, ...initial });
  const [errors, setErrors] = useState({});

  const update = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setValues((previous) => ({ ...previous, [field]: value }));
  };

  function handleSubmit(event) {
    event.preventDefault();
    const found = validateGig(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    onSubmit({
      title: values.title.trim(),
      description: values.description.trim(),
      category: values.category,
      price: Number(values.price),
      deliveryDays: Number(values.deliveryDays),
      isActive: values.isActive,
    });
  }

  // field is always a form field name written in this file, never text from a user.
  /* eslint-disable security/detect-object-injection */
  const errorFor = (field) => errors[field] || serverErrors[field];
  /* eslint-enable security/detect-object-injection */

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      <FormField id="title" label="Title" value={values.title} onChange={update('title')} error={errorFor('title')} maxLength={100} placeholder="Logo design for your business" />
      <FormField as="textarea" id="description" label="Description" rows={6} value={values.description} onChange={update('description')} error={errorFor('description')} maxLength={2000} hint="Explain what the client receives and how you work." />

      <div className="field-row">
        <FormField as="select" id="category" label="Category" value={values.category} onChange={update('category')} error={errorFor('category')}>
          <option value="">Choose a category</option>
          {GIG_CATEGORIES.map((category) => (
            <option key={category} value={category}>{category}</option>
          ))}
        </FormField>
        <FormField id="price" label="Price (rand)" type="number" inputMode="decimal" min="1" max="100000" step="0.01" value={values.price} onChange={update('price')} error={errorFor('price')} />
        <FormField id="deliveryDays" label="Delivery time (days)" type="number" inputMode="numeric" min="1" max="90" step="1" value={values.deliveryDays} onChange={update('deliveryDays')} error={errorFor('deliveryDays')} />
      </div>

      <label className="check">
        <input type="checkbox" checked={values.isActive} onChange={update('isActive')} />
        Visible to clients
      </label>

      <button type="submit" className="btn btn-primary" disabled={submitting}>
        {submitting ? 'Saving...' : submitLabel}
      </button>
    </form>
  );
}
