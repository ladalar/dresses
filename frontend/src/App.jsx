import { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';

const API = '/api/dresses';

const SORT_COLS = [
  { key: 'rank', label: 'Rank' },
  { key: 'name', label: 'Name' },
  { key: 'price', label: 'Price' },
  { key: 'created_at', label: 'Date Added' },
];

const SILHOUETTE_OPTIONS = ['A-line', 'Ball Gown', 'Mermaid', 'Trumpet', 'Sheath', 'Column', 'Tea-length', 'Mini'];
const SLEEVES_OPTIONS    = ['Sleeveless', 'Strapless', 'Cap Sleeves', 'Short Sleeves', '3/4 Sleeves', 'Long Sleeves'];
const NECKLINE_OPTIONS   = ['V-neck', 'Sweetheart', 'Square', 'Straight', 'Halter', 'Off-shoulder', 'Illusion', 'Scoop', 'High neck'];
const FEATURES_OPTIONS   = ['Corset', 'Leg Slit', 'Pockets', 'Train', 'Lace', 'Beading', 'Bow', 'Open Back', 'Detachable Sleeves', 'Floral Appliqués', 'Ruching', 'Cape'];

const EMPTY_FORM = {
  name: '', image_url: '', image_url_2: '', image_url_3: '', image_url_4: '',
  price: '', link: '', rank: '', comments: '',
  silhouette: '', sleeves: '', neckline: '', features: [],
};

// Returns non-empty image URLs from a dress object (up to 4)
function getDressImages(d) {
  return [d.image_url, d.image_url_2, d.image_url_3, d.image_url_4].filter(Boolean);
}

// Parse comma-separated features string → array (trims whitespace around each item)
function parseFeatures(str) {
  if (!str) return [];
  return str.split(',').map(s => s.trim()).filter(Boolean);
}

const ZOOM_WIDTH = 360;

// Thumbnail with hover-zoom overlay
function DressThumb({ src, alt }) {
  const [hovered, setHovered] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const ref = useRef(null);

  const handleMouseEnter = () => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      // Show zoom to the right of the thumbnail; flip left if too close to viewport edge
      const left = rect.right + 12 + ZOOM_WIDTH > window.innerWidth
        ? rect.left - ZOOM_WIDTH - 12
        : rect.right + 12;
      setPos({ top: rect.top, left });
    }
    setHovered(true);
  };

  if (failed) return <div className="no-image">👗</div>;

  return (
    <span ref={ref} className="thumb-wrap"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setHovered(false)}>
      <img
        src={src}
        alt={alt}
        className="dress-thumb"
        onError={() => setFailed(true)}
      />
      {hovered && (
        <div className="thumb-zoom" style={{ top: pos.top, left: pos.left }}>
          <img src={src} alt={alt} />
        </div>
      )}
    </span>
  );
}

// Image URL input row inside the form
function ImageField({ label, value, onChange }) {
  return (
    <div className="form-field">
      <label>{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder="https://..." />
      {value && (
        <img
          src={value}
          alt="preview"
          className="preview-img"
          onError={e => { e.target.style.display = 'none'; }}
          onLoad={e => { e.target.style.display = 'block'; }}
        />
      )}
    </div>
  );
}

// Single-select dropdown field for the form
function SelectField({ label, value, onChange, options }) {
  return (
    <div className="form-field">
      <label>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}>
        <option value="">— Select —</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

// Checkbox grid for multi-select features
function FeaturesField({ value, onChange }) {
  const toggle = (feat) => {
    if (value.includes(feat)) onChange(value.filter(f => f !== feat));
    else onChange([...value, feat]);
  };
  return (
    <div className="form-field">
      <label>Features</label>
      <div className="features-grid">
        {FEATURES_OPTIONS.map(f => (
          <label key={f} className="feature-check">
            <input type="checkbox" checked={value.includes(f)} onChange={() => toggle(f)} />
            {f}
          </label>
        ))}
      </div>
    </div>
  );
}

function DressModal({ dress, onClose, onSave }) {
  const [form, setForm] = useState(
    dress
      ? {
          ...EMPTY_FORM,
          ...dress,
          price: dress.price ?? '',
          rank: dress.rank ?? '',
          image_url: dress.image_url ?? '',
          image_url_2: dress.image_url_2 ?? '',
          image_url_3: dress.image_url_3 ?? '',
          image_url_4: dress.image_url_4 ?? '',
          silhouette: dress.silhouette ?? '',
          sleeves: dress.sleeves ?? '',
          neckline: dress.neckline ?? '',
          features: parseFeatures(dress.features),
        }
      : { ...EMPTY_FORM }
  );
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
        image_url_2: form.image_url_2.trim() || null,
        image_url_3: form.image_url_3.trim() || null,
        image_url_4: form.image_url_4.trim() || null,
        price: form.price !== '' ? parseFloat(form.price) : null,
        link: form.link.trim() || null,
        rank: form.rank !== '' ? parseInt(form.rank, 10) : null,
        comments: form.comments.trim() || null,
        silhouette: form.silhouette || null,
        sleeves: form.sleeves || null,
        neckline: form.neckline || null,
        features: form.features.length > 0 ? form.features.join(',') : null,
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

          <ImageField label="Image 1" value={form.image_url} onChange={v => set('image_url', v)} />
          <ImageField label="Image 2" value={form.image_url_2} onChange={v => set('image_url_2', v)} />
          <ImageField label="Image 3" value={form.image_url_3} onChange={v => set('image_url_3', v)} />
          <ImageField label="Image 4" value={form.image_url_4} onChange={v => set('image_url_4', v)} />

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

          <div className="form-section-label">Style Details</div>
          <SelectField label="Silhouette" value={form.silhouette} onChange={v => set('silhouette', v)} options={SILHOUETTE_OPTIONS} />
          <SelectField label="Sleeves" value={form.sleeves} onChange={v => set('sleeves', v)} options={SLEEVES_OPTIONS} />
          <SelectField label="Neckline" value={form.neckline} onChange={v => set('neckline', v)} options={NECKLINE_OPTIONS} />
          <FeaturesField value={form.features} onChange={v => set('features', v)} />

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
  const [filters, setFilters] = useState({ silhouette: '', sleeves: '', neckline: '', feature: '' });

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

  const setFilter = (k, v) => setFilters(f => ({ ...f, [k]: v }));
  const clearFilters = () => setFilters({ silhouette: '', sleeves: '', neckline: '', feature: '' });
  const hasFilters = Object.values(filters).some(Boolean);

  const filteredDresses = dresses.filter(d => {
    if (filters.silhouette && d.silhouette !== filters.silhouette) return false;
    if (filters.sleeves    && d.sleeves    !== filters.sleeves)    return false;
    if (filters.neckline   && d.neckline   !== filters.neckline)   return false;
    if (filters.feature) {
      const dFeatures = parseFeatures(d.features);
      if (!dFeatures.includes(filters.feature)) return false;
    }
    return true;
  });

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

      <div className="filter-bar">
        <span className="filter-label">Filter:</span>
        <select value={filters.silhouette} onChange={e => setFilter('silhouette', e.target.value)}>
          <option value="">All Silhouettes</option>
          {SILHOUETTE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <select value={filters.sleeves} onChange={e => setFilter('sleeves', e.target.value)}>
          <option value="">All Sleeves</option>
          {SLEEVES_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <select value={filters.neckline} onChange={e => setFilter('neckline', e.target.value)}>
          <option value="">All Necklines</option>
          {NECKLINE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <select value={filters.feature} onChange={e => setFilter('feature', e.target.value)}>
          <option value="">All Features</option>
          {FEATURES_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        {hasFilters && (
          <button className="btn-clear-filters" onClick={clearFilters}>✕ Clear</button>
        )}
      </div>

      {loading ? (
        <div className="loading">Loading dresses…</div>
      ) : dresses.length === 0 ? (
        <div className="empty">
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👗</div>
          <p>No dresses yet. Click <strong>+ Add Dress</strong> to get started!</p>
        </div>
      ) : filteredDresses.length === 0 ? (
        <div className="empty">
          <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🔍</div>
          <p>No dresses match the current filters. <button className="btn-link" onClick={clearFilters}>Clear filters</button></p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th onClick={() => handleSort('rank')}>Rank <span className="sort-icon">{sortIcon('rank')}</span></th>
                <th>Images</th>
                <th onClick={() => handleSort('name')}>Name <span className="sort-icon">{sortIcon('name')}</span></th>
                <th onClick={() => handleSort('price')}>Price <span className="sort-icon">{sortIcon('price')}</span></th>
                <th>Link</th>
                <th>Comments</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDresses.map(d => {
                const imgs = getDressImages(d);
                const dFeatures = parseFeatures(d.features);
                return (
                  <tr key={d.id}>
                    <td>{d.rank != null ? <span className="rank-badge">{d.rank}</span> : '—'}</td>
                    <td>
                      <div className="thumb-gallery">
                        {imgs.length > 0
                          ? imgs.map((src, i) => <DressThumb key={i} src={src} alt={`${d.name} ${i + 1}`} />)
                          : <div className="no-image">👗</div>}
                      </div>
                    </td>
                    <td>
                      <strong>{d.name}</strong>
                      <div className="attr-pills">
                        {d.silhouette && <span className="pill pill-silhouette">{d.silhouette}</span>}
                        {d.sleeves    && <span className="pill pill-sleeves">{d.sleeves}</span>}
                        {d.neckline   && <span className="pill pill-neckline">{d.neckline}</span>}
                        {dFeatures.map(f => <span key={f} className="pill pill-feature">{f}</span>)}
                      </div>
                    </td>
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
                );
              })}
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
