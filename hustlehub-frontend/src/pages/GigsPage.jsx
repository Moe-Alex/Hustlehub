import { useState } from 'react';
import { api } from '../api/client';
import DataState from '../components/DataState';
import GigCard from '../components/GigCard';
import Pagination from '../components/Pagination';
import PageHeader from '../components/PageHeader';
import { useApi } from '../hooks/useApi';
import { GIG_CATEGORIES } from '../utils/validators';

const DEFAULT_FILTERS = { q: '', category: '', sort: 'newest' };

export default function GigsPage() {
  const [form, setForm] = useState(DEFAULT_FILTERS);
  const [applied, setApplied] = useState(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);

  const { data, error, loading } = useApi(
    () => api.gigs.list({ ...applied, page, limit: 9 }),
    [applied.q, applied.category, applied.sort, page]
  );

  const update = (field) => (event) => setForm((previous) => ({ ...previous, [field]: event.target.value }));

  function applyFilters(event) {
    event.preventDefault();
    setApplied(form);
    setPage(1);
  }

  function clearFilters() {
    setForm(DEFAULT_FILTERS);
    setApplied(DEFAULT_FILTERS);
    setPage(1);
  }

  const gigs = data ? data.data : [];
  const filtered = Boolean(applied.q || applied.category);

  return (
    <>
      <PageHeader title="Browse gigs" intro="Find a freelancer for your next job. Open a gig to read the details and book it." />

      <form className="filters" onSubmit={applyFilters} role="search">
        <div className="field">
          <label htmlFor="q">Search</label>
          <input id="q" type="search" value={form.q} onChange={update('q')} maxLength={100} placeholder="Logo, tutoring, photos..." />
        </div>
        <div className="field">
          <label htmlFor="category">Category</label>
          <select id="category" value={form.category} onChange={update('category')}>
            <option value="">All categories</option>
            {GIG_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="sort">Sort by</label>
          <select id="sort" value={form.sort} onChange={update('sort')}>
            <option value="newest">Newest first</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
          </select>
        </div>
        <button type="submit" className="btn btn-primary">Search</button>
      </form>

      <DataState loading={loading} error={error} loadingLabel="Loading gigs...">
        {gigs.length === 0 ? (
          <section className="empty-state">
            <h2>{filtered ? 'No gigs match your search' : 'No gigs yet'}</h2>
            <p>{filtered ? 'Try different words or remove a filter.' : 'Freelancers have not listed any gigs yet. Check back soon.'}</p>
            {filtered && <button type="button" className="btn btn-outline" onClick={clearFilters}>Clear filters</button>}
          </section>
        ) : (
          <>
            <div className="gig-grid">{gigs.map((gig) => <GigCard key={gig.id} gig={gig} />)}</div>
            <Pagination page={page} pages={data.pagination.pages} onChange={setPage} />
          </>
        )}
      </DataState>
    </>
  );
}
