import { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';

const API = '/api/dresses';

const SORT_COLS = [
  { key: 'rank',       label: 'Rank' },
  { key: 'name',       label: 'Name' },
  { key: 'price',      label: 'Price' },
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

function getDressImages(d) {
  return [d.image_url, d.image_url_2, d.image_url_3, d.image_url_4].filter(Boolean);
}

function parseFeatures(str) {
  if (!str) return [];
  return str.split(',').map(s => s.trim()).filter(Boolean);
}

const ZOOM_WIDTH = 360;

// ── Thumbnail with hover-zoom overlay ─────────────────────────────────────────
function DressThumb({ src, alt }) {
  const [hovered, setHovered] = useState(false);
  const [failed, setFailed]   = useState(false);
  const [pos, setPos]         = useState({ top: 0, left: 0 });
  const ref = useRef(null);

  const handleMouseEnter = () => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
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
      <img src={src} alt={alt} className="dress-thumb" onError={() => setFailed(true)} />
      {hovered && (
        <div className="thumb-zoom" style={{ top: pos.top, left: pos.left }}>
          <img src={src} alt={alt} />
        </div>
      )}
    </span>
  );
}

// ── Image field in modal (preview above, input below) ─────────────────────────
function ImageField({ label, value, onChange }) {
  return (
    <div className="img-field">
      <div className="img-preview-box">
        {value
          ? <img src={value} alt="preview" className="preview-img"
              onError={e => { e.target.style.display = 'none'; }}
              onLoad={e  => { e.target.style.display = 'block'; }} />
          : <div className="preview-placeholder">👗</div>}
      </div>
      <span className="img-field-label">{label}</span>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder="https://…" />
    </div>
  );
}

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

function FeaturesField({ value, onChange }) {
  const toggle = feat => value.includes(feat)
    ? onChange(value.filter(f => f !== feat))
    : onChange([...value, feat]);
  return (
    <div className="form-field form-field-full">
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

// ── Add / Edit modal ──────────────────────────────────────────────────────────
function DressModal({ dress, onClose, onSave }) {
  const [form, setForm] = useState(
    dress
      ? {
          ...EMPTY_FORM, ...dress,
          price:      dress.price      ?? '',
          rank:       dress.rank       ?? '',
          image_url:  dress.image_url  ?? '',
          image_url_2: dress.image_url_2 ?? '',
          image_url_3: dress.image_url_3 ?? '',
          image_url_4: dress.image_url_4 ?? '',
          silhouette: dress.silhouette ?? '',
          sleeves:    dress.sleeves    ?? '',
          neckline:   dress.neckline   ?? '',
          features:   parseFeatures(dress.features),
        }
      : { ...EMPTY_FORM }
  );
  const [error, setError]   = useState('');
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Name is required.'); return; }
    setSaving(true);
    setError('');
    try {
      const payload = {
        name:        form.name.trim(),
        image_url:   form.image_url.trim()   || null,
        image_url_2: form.image_url_2.trim() || null,
        image_url_3: form.image_url_3.trim() || null,
        image_url_4: form.image_url_4.trim() || null,
        price:       form.price   !== '' ? parseFloat(form.price)        : null,
        link:        form.link.trim()    || null,
        rank:        form.rank    !== '' ? parseInt(form.rank, 10)       : null,
        comments:    form.comments.trim() || null,
        silhouette:  form.silhouette || null,
        sleeves:     form.sleeves    || null,
        neckline:    form.neckline   || null,
        features:    form.features.length > 0 ? form.features.join(',') : null,
      };
      const url    = dress ? `${API}/${dress.id}` : API;
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
      onSave(await res.json());
    } catch {
      setError('Network error.');
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>{dress ? 'Edit Dress' : 'Add New Dress'}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <form onSubmit={handleSubmit}>

          {/* ── Images: 4 side-by-side ── */}
          <p className="form-section-label">Images</p>
          <div className="images-row">
            <ImageField label="Image 1" value={form.image_url}   onChange={v => set('image_url',   v)} />
            <ImageField label="Image 2" value={form.image_url_2} onChange={v => set('image_url_2', v)} />
            <ImageField label="Image 3" value={form.image_url_3} onChange={v => set('image_url_3', v)} />
            <ImageField label="Image 4" value={form.image_url_4} onChange={v => set('image_url_4', v)} />
          </div>

          {/* ── Basic fields ── */}
          <p className="form-section-label">Details</p>
          <div className="form-grid-2">
            <div className="form-field form-field-full">
              <label>Name *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Vera Wang Classic" />
            </div>
            <div className="form-field">
              <label>Price ($)</label>
              <input type="number" min="0" step="0.01" value={form.price} onChange={e => set('price', e.target.value)} placeholder="e.g. 2500" />
            </div>
            <div className="form-field">
              <label>Rank</label>
              <input type="number" min="1" value={form.rank} onChange={e => set('rank', e.target.value)} placeholder="e.g. 1" />
            </div>
            <div className="form-field form-field-full">
              <label>Link</label>
              <input value={form.link} onChange={e => set('link', e.target.value)} placeholder="https://…" />
            </div>
            <div className="form-field form-field-full">
              <label>Comments</label>
              <textarea value={form.comments} onChange={e => set('comments', e.target.value)} placeholder="Your notes…" />
            </div>
          </div>

          {/* ── Style Details ── */}
          <p className="form-section-label">Style Details</p>
          <div className="form-grid-2">
            <SelectField label="Silhouette" value={form.silhouette} onChange={v => set('silhouette', v)} options={SILHOUETTE_OPTIONS} />
            <SelectField label="Sleeves"    value={form.sleeves}    onChange={v => set('sleeves',    v)} options={SLEEVES_OPTIONS} />
            <SelectField label="Neckline"   value={form.neckline}   onChange={v => set('neckline',   v)} options={NECKLINE_OPTIONS} />
            <FeaturesField value={form.features} onChange={v => set('features', v)} />
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

// ── Dress card (images on top, details below) ─────────────────────────────────
function DressCard({ dress, onEdit, onDelete }) {
  const imgs      = getDressImages(dress);
  const dFeatures = parseFeatures(dress.features);
  return (
    <div className="dress-card">
      <div className="card-gallery">
        {imgs.length > 0
          ? imgs.map((src, i) => <DressThumb key={i} src={src} alt={`${dress.name} ${i + 1}`} />)
          : <div className="no-image card-no-img">👗</div>}
      </div>
      <div className="card-body">
        <div className="card-top-row">
          <div className="card-name-wrap">
            {dress.rank != null && <span className="rank-badge">{dress.rank}</span>}
            <strong className="card-name">{dress.name}</strong>
          </div>
          {dress.price != null && (
            <span className="card-price">${Number(dress.price).toLocaleString()}</span>
          )}
        </div>
        {(dress.silhouette || dress.sleeves || dress.neckline || dFeatures.length > 0) && (
          <div className="attr-pills">
            {dress.silhouette && <span className="pill pill-silhouette">{dress.silhouette}</span>}
            {dress.sleeves    && <span className="pill pill-sleeves">{dress.sleeves}</span>}
            {dress.neckline   && <span className="pill pill-neckline">{dress.neckline}</span>}
            {dFeatures.map(f  => <span key={f} className="pill pill-feature">{f}</span>)}
          </div>
        )}
        {dress.comments && <p className="card-comments">{dress.comments}</p>}
        <div className="card-footer">
          {dress.link
            ? <a href={dress.link} target="_blank" rel="noreferrer" className="dress-link">View ↗</a>
            : <span />}
          <div className="actions">
            <button className="btn-edit"   onClick={() => onEdit(dress)}>Edit</button>
            <button className="btn-delete" onClick={() => onDelete(dress.id)}>Delete</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub }) {
  return (
    <div className="stat-card">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

function BarChart({ title, data }) {
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div className="chart-card">
      <h3 className="chart-title">{title}</h3>
      {data.length === 0
        ? <p className="chart-empty">No data yet</p>
        : (
          <div className="chart-rows">
            {data.map(({ label, count, pct }) => (
              <div key={label} className="chart-row">
                <span className="chart-label">{label}</span>
                <div className="chart-bar-wrap">
                  <div className="chart-bar" style={{ width: `${(count / max) * 100}%` }} />
                </div>
                <span className="chart-stat">{pct}% <em>({count})</em></span>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}

function Dashboard({ dresses }) {
  const total = dresses.length;
  if (total === 0) {
    return (
      <div className="empty">
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</div>
        <p>Add dresses to see statistics here.</p>
      </div>
    );
  }

  const prices   = dresses.map(d => d.price).filter(p => p != null);
  const avgPrice = prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : null;
  const minPrice = prices.length ? Math.min(...prices) : null;
  const maxPrice = prices.length ? Math.max(...prices) : null;

  const countBy = field => {
    const counts = {};
    dresses.forEach(d => { const v = d[field]; if (v) counts[v] = (counts[v] || 0) + 1; });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([label, count]) => ({ label, count, pct: Math.round((count / total) * 100) }));
  };

  const featureCounts = (() => {
    const counts = {};
    dresses.forEach(d => parseFeatures(d.features).forEach(f => { counts[f] = (counts[f] || 0) + 1; }));
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([label, count]) => ({ label, count, pct: Math.round((count / total) * 100) }));
  })();

  const withImages     = dresses.filter(d => getDressImages(d).length > 0).length;
  const withStyleData  = dresses.filter(d => d.silhouette || d.neckline || d.sleeves).length;
  const ranked         = dresses.filter(d => d.rank != null).length;

  return (
    <div className="dashboard">
      <div className="stat-row">
        <StatCard label="Total Dresses"  value={total} />
        <StatCard
          label="Average Price"
          value={avgPrice != null ? `$${avgPrice.toLocaleString()}` : '—'}
          sub={minPrice != null ? `$${minPrice.toLocaleString()} – $${maxPrice.toLocaleString()}` : undefined}
        />
        <StatCard label="With Images"     value={`${Math.round((withImages    / total) * 100)}%`} sub={`${withImages} of ${total}`} />
        <StatCard label="Style Filled In" value={`${Math.round((withStyleData / total) * 100)}%`} sub={`${withStyleData} of ${total}`} />
        <StatCard label="Ranked"          value={`${Math.round((ranked        / total) * 100)}%`} sub={`${ranked} of ${total}`} />
      </div>
      <div className="chart-grid">
        <BarChart title="Silhouette" data={countBy('silhouette')} />
        <BarChart title="Neckline"   data={countBy('neckline')} />
        <BarChart title="Sleeves"    data={countBy('sleeves')} />
        <BarChart title="Features"   data={featureCounts} />
      </div>
    </div>
  );
}

// ── Root app ──────────────────────────────────────────────────────────────────
export default function App() {
  const [dresses,   setDresses]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [sortBy,    setSortBy]    = useState('rank');
  const [order,     setOrder]     = useState('asc');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing,   setEditing]   = useState(null);
  const [filters,   setFilters]   = useState({ silhouette: '', sleeves: '', neckline: '', feature: '' });
  const [activeTab, setActiveTab] = useState('rankings');

  const fetchDresses = useCallback(async (sb = sortBy, ord = order) => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}?sortBy=${sb}&order=${ord}`);
      const data = await res.json();
      setDresses(data);
    } catch {
      setDresses([]);
    } finally {
      setLoading(false);
    }
  }, [sortBy, order]);

  useEffect(() => { fetchDresses(); }, [fetchDresses]);

  const handleSort = col => {
    const newOrder = col === sortBy && order === 'asc' ? 'desc' : 'asc';
    setSortBy(col);
    setOrder(newOrder);
    fetchDresses(col, newOrder);
  };

  const handleDelete = async id => {
    if (!window.confirm('Remove this dress from your ranking?')) return;
    await fetch(`${API}/${id}`, { method: 'DELETE' });
    setDresses(prev => prev.filter(d => d.id !== id));
  };

  const handleSave = saved => {
    setDresses(prev => {
      const idx = prev.findIndex(d => d.id === saved.id);
      if (idx >= 0) {
        const n = [...prev];
        n[idx] = saved;
        return n;
      }
      return [...prev, saved];
    });
    setModalOpen(false);
    setEditing(null);
    fetchDresses();
  };

  const sortIcon  = col => col !== sortBy ? '↕' : order === 'asc' ? '↑' : '↓';
  const setFilter = (k, v) => setFilters(f => ({ ...f, [k]: v }));
  const clearFilters = () => setFilters({ silhouette: '', sleeves: '', neckline: '', feature: '' });
  const hasFilters = Object.values(filters).some(Boolean);

  const filteredDresses = dresses.filter(d => {
    if (filters.silhouette && d.silhouette !== filters.silhouette) return false;
    if (filters.sleeves    && d.sleeves    !== filters.sleeves)    return false;
    if (filters.neckline   && d.neckline   !== filters.neckline)   return false;
    if (filters.feature && !parseFeatures(d.features).includes(filters.feature)) return false;
    return true;
  });

  return (
    <>
      {/* ── Site header ── */}
      <header className="site-header">
        <div className="header-inner">
          <div>
            <h1 className="site-title">💍 Wedding Dress Rankings</h1>
            <p className="site-sub">Your personal curation of favourite wedding dresses</p>
          </div>
          <button className="btn-add" onClick={() => { setEditing(null); setModalOpen(true); }}>
            + Add Dress
          </button>
        </div>
        <nav className="tab-bar">
          <button className={`tab-btn${activeTab === 'rankings'  ? ' active' : ''}`} onClick={() => setActiveTab('rankings')}>Rankings</button>
          <button className={`tab-btn${activeTab === 'dashboard' ? ' active' : ''}`} onClick={() => setActiveTab('dashboard')}>Dashboard</button>
        </nav>
      </header>

      <main className="main-content">
        {activeTab === 'dashboard' ? (
          <Dashboard dresses={dresses} />
        ) : (
          <>
            {/* ── Sort toolbar ── */}
            <div className="toolbar">
              <span className="toolbar-label">Sort</span>
              {SORT_COLS.map(c => (
                <button key={c.key}
                  className={`sort-btn${sortBy === c.key ? ' active' : ''}`}
                  onClick={() => handleSort(c.key)}>
                  {c.label} <span className="sort-icon">{sortIcon(c.key)}</span>
                </button>
              ))}
            </div>

            {/* ── Filter bar ── */}
            <div className="filter-bar">
              <span className="filter-label">Filter</span>
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

            {/* ── Content ── */}
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
                <p>No dresses match the current filters.{' '}
                  <button className="btn-link" onClick={clearFilters}>Clear filters</button>
                </p>
              </div>
            ) : (
              <div className="card-grid">
                {filteredDresses.map(d => (
                  <DressCard key={d.id} dress={d}
                    onEdit={d => { setEditing(d); setModalOpen(true); }}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>

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
