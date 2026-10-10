// A message box. Errors are announced to screen readers immediately; other messages politely.

export default function Alert({ variant = 'info', children }) {
  return (
    <div className={`alert alert-${variant}`} role={variant === 'error' ? 'alert' : 'status'}>
      {children}
    </div>
  );
}
