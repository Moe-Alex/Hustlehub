// A labelled input, textarea or select with an optional hint and an accessible error message.

export default function FormField({ id, label, error, hint, as: Tag = 'input', children, ...rest }) {
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;

  return (
    <div className={`field${error ? ' field-invalid' : ''}`}>
      <label htmlFor={id}>{label}</label>
      <Tag id={id} aria-invalid={error ? 'true' : undefined} aria-describedby={describedBy} {...rest}>
        {children}
      </Tag>
      {hint && <p className="field-hint" id={`${id}-hint`}>{hint}</p>}
      {error && <p className="field-error" id={`${id}-error`}>{error}</p>}
    </div>
  );
}
