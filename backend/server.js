const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3001;
const uploadsDir = path.join(__dirname, 'uploads');
const imagesDir = path.join(__dirname, '../images');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const safeBase = path.basename(file.originalname, path.extname(file.originalname)).replace(/[^a-zA-Z0-9_-]/g, '_');
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `${Date.now()}-${safeBase}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image uploads are allowed'));
    }
    return cb(null, true);
  },
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});

const staticLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use('/api', apiLimiter);
app.use('/uploads', express.static(uploadsDir));
app.use('/images', express.static(imagesDir));

// Serve built frontend
const frontendDist = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendDist));

// Upload image file and return relative URL to store in DB
app.post('/api/uploads', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Image file is required' });
  return res.status(201).json({ url: `/uploads/${req.file.filename}` });
});

// List uploaded images so users can pick from the images folder in the UI
app.get('/api/uploads', (req, res) => {
  try {
    const images = fs
      .readdirSync(uploadsDir, { withFileTypes: true })
      .filter(entry => entry.isFile())
      .map(entry => entry.name)
      .sort((a, b) => b.localeCompare(a))
      .map(name => `/uploads/${encodeURIComponent(name)}`);

    return res.json(images);
  } catch {
    return res.status(500).json({ error: 'Failed to read images folder' });
  }
});

// List repository images so users can pick from the images folder in the UI
app.get('/api/images', (req, res) => {
  try {
    const images = fs
      .readdirSync(imagesDir, { withFileTypes: true })
      .filter(entry => entry.isFile())
      .map(entry => entry.name)
      .sort((a, b) => b.localeCompare(a))
      .map(name => `/images/${encodeURIComponent(name)}`);

    return res.json(images);
  } catch {
    return res.status(500).json({ error: 'Failed to read images folder' });
  }
});

// GET all dresses with optional sorting
app.get('/api/dresses', (req, res) => {
  const { sortBy = 'rank', order = 'asc' } = req.query;
  const columnMap = {
    id: 'id',
    name: 'name',
    price: 'price',
    rank: 'rank',
    created_at: 'created_at',
  };
  const col = columnMap[sortBy] ?? 'rank';
  const dir = order.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

  const dresses = db.prepare(`SELECT * FROM dresses ORDER BY ${col} ${dir}`).all();
  res.json(dresses);
});

// GET single dress
app.get('/api/dresses/:id', (req, res) => {
  const dress = db.prepare('SELECT * FROM dresses WHERE id = ?').get(req.params.id);
  if (!dress) return res.status(404).json({ error: 'Dress not found' });
  res.json(dress);
});

// POST create dress
app.post('/api/dresses', (req, res) => {
  const { name, image_url, image_url_2, image_url_3, image_url_4, price, link, rank, comments,
          silhouette, sleeves, neckline, features } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  const result = db
    .prepare(
      'INSERT INTO dresses (name, image_url, image_url_2, image_url_3, image_url_4, price, link, rank, comments, silhouette, sleeves, neckline, features) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
    .run(
      name,
      image_url || null,
      image_url_2 || null,
      image_url_3 || null,
      image_url_4 || null,
      price || null,
      link || null,
      rank || null,
      comments || null,
      silhouette || null,
      sleeves || null,
      neckline || null,
      features || null
    );

  const created = db.prepare('SELECT * FROM dresses WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(created);
});

// PUT update dress
app.put('/api/dresses/:id', (req, res) => {
  const { name, image_url, image_url_2, image_url_3, image_url_4, price, link, rank, comments,
          silhouette, sleeves, neckline, features } = req.body;
  const existing = db.prepare('SELECT * FROM dresses WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Dress not found' });

  db.prepare(
    'UPDATE dresses SET name = ?, image_url = ?, image_url_2 = ?, image_url_3 = ?, image_url_4 = ?, price = ?, link = ?, rank = ?, comments = ?, silhouette = ?, sleeves = ?, neckline = ?, features = ? WHERE id = ?'
  ).run(
    name ?? existing.name,
    image_url ?? existing.image_url,
    image_url_2 ?? existing.image_url_2,
    image_url_3 ?? existing.image_url_3,
    image_url_4 ?? existing.image_url_4,
    price ?? existing.price,
    link ?? existing.link,
    rank ?? existing.rank,
    comments ?? existing.comments,
    silhouette ?? existing.silhouette,
    sleeves ?? existing.sleeves,
    neckline ?? existing.neckline,
    features ?? existing.features,
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM dresses WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// DELETE dress
app.delete('/api/dresses/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM dresses WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Dress not found' });

  db.prepare('DELETE FROM dresses WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

// Friendly error for oversized uploads (for base64 image submissions)
app.use((err, req, res, next) => {
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Uploaded image is too large. Please use a smaller image file.' });
  }
  if (err?.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'Image file is too large. Max size is 8MB.' });
  }
  if (err?.message === 'Only image uploads are allowed') {
    return res.status(400).json({ error: err.message });
  }
  return next(err);
});

// Serve React frontend for all non-API routes
app.get('/{*path}', staticLimiter, (req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Backend API running on http://localhost:${PORT}`);
});

module.exports = app;
