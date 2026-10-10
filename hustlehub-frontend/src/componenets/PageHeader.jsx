// Page title with an optional intro line and actions on the right.

export default function PageHeader({ title, intro, actions }) {
  return (
    <header className="page-head">
      <div>
        <h1>{title}</h1>
        {intro && <p className="page-intro">{intro}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  );
}
