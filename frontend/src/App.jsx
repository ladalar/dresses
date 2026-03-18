import { useState, useEffect, useCallback } from 'react';
import './App.css';

const API = '/api/dresses';

const SORT_COLS = [
  { key: 'rank', label: 'Rank' },
  { key: 'name', label: 'Name' },
  { key: 'price', label: 'Price' },
  { key: 'created_at', label: 'Date Added' },
];

const EMPTY_FORM = { name: '', image_url: '', price: '', link: '', rank: '', comments: '' };

function DressModal({ dress, onClose, onSave }) {
  const [form, setForm] = useState(dress ? { ...dress, price: dress.price ?? '', rank: dress.rank ?? '' } : { ...EMPTY_FORM });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Name is required.'); return; }
    setSaving(true);
    setError('');
    try {
      const payload = {
        name: form.name.trim(),
        image_url: form.image_url.trim() || null,
        price: form.price !== '' ? parseFloat(form.price) : null,
        link: form.link.trim() || null,
        rank: form.rank !== '' ? parseInt(form.rank, 10) : null,
        comments: form.comments.trim() || null,
      };
      const url = dress ? `${API}/${dress.id}` : API;
      const method = dress ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to save.');
        setSaving(false);
        return;
      }
      const saved = await res.json();
      onSave(saved);
    } catch {
      setError('Network error.');
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2>{dress ? 'Edit Dress' : 'Add New Dress'}</h2>
        <form onSubmit={handleSubmit} className="form-grid">
          <div className="form-field">
            <label>Name *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Vera Wang Classic" />
          </div>
          <div className="form-field">
            <label>Image URL</label>
            <input value={form.image_url} onChange={e => set('image_url', e.target.value)} placeholder="https://..." />
            {form.image_url && (
              <img src={form.image_url} alt="preview" className="preview-img" onError={e => { e.target.style.display = 'none'; }} />
            )}
          </div>
          <div className="form-field">
            <label>Price ($)</label>
            <input type="number" min="0" step="0.01" value={form.price} onChange={e => set('price', e.target.value)} placeholder="e.g. 2500" />
          </div>
          <div className="form-field">
            <label>Link</label>
            <input value={form.link} onChange={e => set('link', e.target.value)} placeholder="https://..." />
          </div>
          <div className="form-field">
            <label>Rank</label>
            <input type="number" min="1" value={form.rank} onChange={e => set('rank', e.target.value)} placeholder="e.g. 1" />
          </div>
          <div className="form-field">
            <label>Comments</label>
            <textarea value={form.comments} onChange={e => set('comments', e.target.value)} placeholder="Your notes about this dress..." />
          </div>
          {error && <p className="error-msg">{error}</p>}
          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-save" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function App() {
  const [dresses, setDresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('rank');
  const [order, setOrder] = useState('asc');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const fetchDresses = useCallback(async (sb = sortBy, ord = order) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}?sortBy=${sb}&order=${ord}`);
      const data = await res.json();
      setDresses(data);
    } catch {
      setDresses([]);
    } finally {
      setLoading(false);
    }
  }, [sortBy, order]);

  useEffect(() => { fetchDresses(); }, [fetchDresses]);

  const handleSort = (col) => {
    let newOrder = 'asc';
    if (col === sortBy) newOrder = order === 'asc' ? 'desc' : 'asc';
    setSortBy(col);
    setOrder(newOrder);
    fetchDresses(col, newOrder);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this dress from your ranking?')) return;
    await fetch(`${API}/${id}`, { method: 'DELETE' });
    setDresses(prev => prev.filter(d => d.id !== id));
  };

  const handleSave = (saved) => {
    setDresses(prev => {
      const idx = prev.findIndex(d => d.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [...prev, saved];
    });
    setModalOpen(false);
    setEditing(null);
    fetchDresses();
  };

  const sortIcon = (col) => {
    if (col !== sortBy) return '↕';
    return order === 'asc' ? '↑' : '↓';
  };

  return (
    <>
      <div className="header">
        <h1>💍 Wedding Dress Rankings</h1>
        <p>Your personal ranking of favourite wedding dresses</p>
      </div>

      <div className="toolbar">
        <span>Sort by:</span>
        {SORT_COLS.map(c => (
          <button key={c.key} onClick={() => handleSort(c.key)}
            style={{ background: sortBy === c.key ? '#8b4570' : '#f3e0eb', color: sortBy === c.key ? 'white' : '#3a2a2a', border: '1px solid #d4a0c0' }}>
            {c.label} {sortIcon(c.key)}
          </button>
        ))}
        <button className="btn-add" onClick={() => { setEditing(null); setModalOpen(true); }}>+ Add Dress</button>
      </div>

      {loading ? (
        <div className="loading">Loading dresses…</div>
      ) : dresses.length === 0 ? (
        <div className="empty">
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👗</div>
          <p>No dresses yet. Click <strong>+ Add Dress</strong> to get started!</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th onClick={() => handleSort('rank')}>Rank <span className="sort-icon">{sortIcon('rank')}</span></th>
                <th>Image</th>
                <th onClick={() => handleSort('name')}>Name <span className="sort-icon">{sortIcon('name')}</span></th>
                <th onClick={() => handleSort('price')}>Price <span className="sort-icon">{sortIcon('price')}</span></th>
                <th>Link</th>
                <th>Comments</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {dresses.map(d => (
                <tr key={d.id}>
                  <td>{d.rank != null ? <span className="rank-badge">{d.rank}</span> : '—'}</td>
                  <td>
                    {d.image_url
                      ? <img src={d.image_url} alt={d.name} className="dress-thumb" onError={e => { e.target.replaceWith(Object.assign(document.createElement('div'), { className: 'no-image', textContent: '👗' })); }} />
                      : <div className="no-image">👗</div>}
                  </td>
                  <td><strong>{d.name}</strong></td>
                  <td>{d.price != null ? `$${Number(d.price).toLocaleString()}` : '—'}</td>
                  <td>{d.link ? <a href={d.link} target="_blank" rel="noreferrer" className="dress-link">View ↗</a> : '—'}</td>
                  <td style={{ maxWidth: '220px', whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>{d.comments || '—'}</td>
                  <td>
                    <div className="actions">
                      <button className="btn-edit" onClick={() => { setEditing(d); setModalOpen(true); }}>Edit</button>
                      <button className="btn-delete" onClick={() => handleDelete(d.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <DressModal
          dress={editing}
          onClose={() => { setModalOpen(false); setEditing(null); }}
          onSave={handleSave}
        />
      )}
    </>
  );
}
