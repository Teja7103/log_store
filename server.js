const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Render has an ephemeral filesystem. Set UPLOAD_DIR env var if you attach a disk,
// e.g. UPLOAD_DIR=/opt/render/project/uploads  (must match render.yaml disk mountPath)
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

app.use(cors());
app.use(express.json());

// ---- Multer storage: store files on server disk ----
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    // sanitize original name, prefix with timestamp to avoid collisions
    const safe = path
      .basename(file.originalname)
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .slice(0, 200) || 'file';
    cb(null, `${Date.now()}-${safe}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB per file
    files: 20,
  },
});

function fileInfo(filename) {
  const filepath = path.join(UPLOAD_DIR, filename);
  const stat = fs.statSync(filepath);
  return {
    filename,
    size: stat.size,
    mtime: stat.mtime,
    url: `/api/files/${encodeURIComponent(filename)}`,
  };
}

// ---- Routes ----

app.get('/', (req, res) => {
  res.type('html').send(`<!doctype html>
<html><head><meta charset="utf-8"><title>Upload API</title></head>
<body style="font-family:sans-serif;max-width:640px;margin:40px auto">
<h2>Multipart Upload API</h2>
<form action="/api/upload" method="post" enctype="multipart/form-data">
  <input type="file" name="files" multiple />
  <button type="submit">Upload</button>
</form>
<p>Endpoints:</p>
<ul>
  <li><b>POST /api/upload</b> — form field <code>files</code> (up to 20 files)</li>
  <li><b>GET /api/files</b> — list stored files</li>
  <li><b>GET /api/files/:filename</b> — download a file</li>
  <li><b>DELETE /api/files/:filename</b> — delete a file</li>
  <li><b>GET /health</b> — health check</li>
</ul>
<p>curl example:<br><code>curl -F "files=@/path/to/a.log" -F "files=@/path/to/b.log" https://YOUR-SERVICE.onrender.com/api/upload</code></p>
</body></html>`);
});

app.get('/health', (req, res) => res.json({ ok: true }));

// Accept multiple files under field name "files"
app.post('/api/upload', upload.array('files', 20), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files received. Use multipart form-data with field name "files".' });
  }
  const files = req.files.map((f) => ({
    filename: f.filename,
    originalName: f.originalname,
    size: f.size,
    mimetype: f.mimetype,
    url: `/api/files/${encodeURIComponent(f.filename)}`,
  }));
  res.status(201).json({ uploaded: files.length, files });
});

// List stored files
app.get('/api/files', (req, res) => {
  const names = fs.readdirSync(UPLOAD_DIR).filter((n) => {
    if (n.startsWith('.')) return false;
    try {
      return fs.statSync(path.join(UPLOAD_DIR, n)).isFile();
    } catch {
      return false;
    }
  });
  res.json({ count: names.length, files: names.map(fileInfo) });
});

// Download a file
app.get('/api/files/:filename', (req, res) => {
  const name = path.basename(req.params.filename);
  const filepath = path.join(UPLOAD_DIR, name);
  if (!fs.existsSync(filepath)) return res.status(404).json({ error: 'File not found' });
  res.download(filepath, name);
});

// Delete a file
app.delete('/api/files/:filename', (req, res) => {
  const name = path.basename(req.params.filename);
  const filepath = path.join(UPLOAD_DIR, name);
  if (!fs.existsSync(filepath)) return res.status(404).json({ error: 'File not found' });
  fs.unlinkSync(filepath);
  res.json({ deleted: name });
});

// ---- Error handling (multer etc.) ----
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.message, code: err.code });
  }
  if (err) return res.status(500).json({ error: err.message || 'Server error' });
  next();
});

app.listen(PORT, () => {
  console.log(`Upload API listening on :${PORT}, storing to ${UPLOAD_DIR}`);
});
