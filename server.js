import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Basic configuration
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'dev_secret_change_me')) {
  console.warn('[startup] In production without a secure JWT_SECRET – aborting');
  process.exit(1);
}
const PORT = process.env.PORT || 3001;
const db = new Database(path.join(__dirname, 'app.db'));

db.pragma('journal_mode = WAL');

db.exec(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  admin INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);`);

db.exec(`CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  mood INTEGER,
  tags TEXT,
  notes TEXT,
  conversation_json TEXT,
  upvotes INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id)
);`);

// Track unique upvotes (anonymous fingerprint) to prevent repeated upvote inflation
db.exec(`CREATE TABLE IF NOT EXISTS post_votes (
  post_id INTEGER NOT NULL,
  voter_key TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(post_id, voter_key),
  FOREIGN KEY(post_id) REFERENCES posts(id) ON DELETE CASCADE
);`);

// Helpful indexes as data grows
db.exec('CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);');
db.exec('CREATE INDEX IF NOT EXISTS idx_posts_user_created ON posts(user_id, created_at DESC);');

// Attempt to add admin column if migrating from older schema
try { db.exec('ALTER TABLE users ADD COLUMN admin INTEGER DEFAULT 0'); } catch(e) { /* ignore if exists */ }
// Attempt to add upvotes column to posts if migrating
try { db.exec('ALTER TABLE posts ADD COLUMN upvotes INTEGER DEFAULT 0'); } catch(e) { /* ignore if exists */ }

// Ensure an anonymous user exists for public posting (non-auth)
function ensureAnon() {
  const row = db.prepare('SELECT id FROM users WHERE username = ?').get('anon');
  if (row) return row.id;
  const hash = bcrypt.hashSync('anon_placeholder_pw', 8);
  const stmt = db.prepare('INSERT INTO users (username, password_hash, admin) VALUES (?,?,0)');
  const info = stmt.run('anon', hash);
  return info.lastInsertRowid;
}
const ANON_USER_ID = ensureAnon();

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(__dirname));

// --- Utility: Validation & Sanitization ---
function sanitizeNotes(str){
  if(!str) return '';
  let s = String(str).trim();
  if (s.length > 2000) s = s.slice(0,2000); // length cap
  // remove ASCII control chars except tab/newline/carriage return
  s = s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'');
  return s;
}

function normalizeTags(input){
  if(!input) return [];
  let arr = Array.isArray(input) ? input : String(input).split(',');
  return arr.map(t=>t.trim().toLowerCase())
           .filter(Boolean)
           .slice(0,12) // max 12 tags
           .map(t => t.slice(0,24)); // cap each length
}

function validatePublicPost(body){
  const errors = [];
  const moodRaw = body.mood;
  let mood = null;
  if(moodRaw != null && moodRaw !== ''){
    const n = Number(moodRaw);
    if(!Number.isInteger(n) || n < 1 || n > 5) errors.push('mood must be 1-5'); else mood = n;
  }
  const notes = sanitizeNotes(body.notes || '');
  const tags = normalizeTags(body.tags || body.tagsRaw || []);
  if(!notes && mood == null) errors.push('notes or mood required');
  return { errors, values: { mood, notes, tags } };
}

function clientIp(req){
  const xf = req.headers['x-forwarded-for'];
  if (Array.isArray(xf)) return xf[0];
  if (typeof xf === 'string' && xf.includes(',')) return xf.split(',')[0].trim();
  return (typeof xf === 'string' && xf) || req.socket.remoteAddress || 'unknown';
}

function auth(req, res, next) {
  const hdr = req.headers.authorization;
  if (!hdr) return res.status(401).json({ error: 'Missing Authorization header' });
  const token = hdr.replace(/^Bearer\s+/i, '');
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });
  try {
    const userCount = db.prepare('SELECT COUNT(1) as c FROM users').get().c;
    const isFirst = userCount === 0;
    const hash = bcrypt.hashSync(password, 10);
    const stmt = db.prepare('INSERT INTO users (username, password_hash, admin) VALUES (?, ?, ?)');
    stmt.run(username, hash, isFirst ? 1 : 0);
    return res.json({ success: true, firstUser: isFirst });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Username already exists' });
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });
  const row = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!row) return res.status(401).json({ error: 'Invalid credentials' });
  if (!bcrypt.compareSync(password, row.password_hash)) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ id: row.id, username: row.username, admin: !!row.admin }, JWT_SECRET, { expiresIn: '2h' });
  return res.json({ token });
});

app.get('/api/me', auth, (req, res) => {
  const row = db.prepare('SELECT id, username, admin, created_at FROM users WHERE id = ?').get(req.user.id);
  res.json({ user: row });
});

app.post('/api/posts', auth, (req, res) => {
  const { mood, tags, notes, conversation } = req.body;
  const stmt = db.prepare('INSERT INTO posts (user_id, mood, tags, notes, conversation_json) VALUES (?,?,?,?,?)');
  const info = stmt.run(req.user.id, mood || null, Array.isArray(tags) ? tags.join(',') : '', notes || '', conversation ? JSON.stringify(conversation) : null);
  const created = db.prepare('SELECT * FROM posts WHERE id = ?').get(info.lastInsertRowid);
  res.json({ post: created });
});

app.get('/api/posts', auth, (req, res) => {
  const rows = db.prepare('SELECT p.*, u.username FROM posts p JOIN users u ON u.id = p.user_id WHERE p.user_id = ? ORDER BY p.id DESC LIMIT 100').all(req.user.id);
  res.json({ posts: rows });
});

app.get('/api/feed', auth, (req, res) => {
  const rows = db.prepare('SELECT p.*, u.username FROM posts p JOIN users u ON u.id = p.user_id ORDER BY p.id DESC LIMIT 200').all();
  res.json({ posts: rows });
});

// Public (unauthenticated) read-only feed: limited fields, smaller limit
app.get('/api/feed-public', (req, res) => {
  try {
    const { offset = 0, limit = 20, tag } = req.query;
    const lim = Math.min(Math.max(parseInt(limit,10)||20, 1), 50);
    const off = Math.max(parseInt(offset,10)||0, 0);
    let sql = 'SELECT p.id, p.mood, p.tags, p.notes, p.created_at, p.upvotes, u.username FROM posts p JOIN users u ON u.id = p.user_id';
    const params = [];
    if (tag) { // simple LIKE matching; future: normalize tags table
      sql += ' WHERE p.tags LIKE ?';
      params.push('%'+tag+'%');
    }
    sql += ' ORDER BY p.id DESC LIMIT ? OFFSET ?';
    params.push(lim, off);
    const rows = db.prepare(sql).all(...params);
    const nextOffset = rows.length === lim ? off + lim : null;
    res.json({ posts: rows, nextOffset });
  } catch (e) {
    console.error('feed-public error', e);
    res.status(500).json({ error: 'server error' });
  }
});

// Public create post (anonymous). Basic rate limit (in-memory) per IP.
const rateMap = new Map();
app.post('/api/posts-public', (req, res) => {
  try {
    const ip = clientIp(req);
    const now = Date.now();
    const windowMs = 60000; // 1m sliding window
    const maxPerWindow = 10;
    const entry = rateMap.get(ip) || { count:0, start: now };
    if (now - entry.start > windowMs) { entry.count = 0; entry.start = now; }
    entry.count++; rateMap.set(ip, entry);
    // opportunistic cleanup to keep map small
    if (rateMap.size > 500) {
      for (const [k,v] of rateMap.entries()) { if (now - v.start > windowMs*2) rateMap.delete(k); }
    }
    if (entry.count > maxPerWindow) return res.status(429).json({ error: 'Too many posts, slow down' });

    const { errors, values } = validatePublicPost(req.body || {});
    if (errors.length) return res.status(400).json({ error: errors.join('; ') });

    const stmt = db.prepare('INSERT INTO posts (user_id, mood, tags, notes) VALUES (?,?,?,?)');
    const info = stmt.run(ANON_USER_ID, values.mood || null, values.tags.join(','), values.notes);
    const created = db.prepare('SELECT p.id, p.mood, p.tags, p.notes, p.created_at, p.upvotes, u.username FROM posts p JOIN users u ON u.id = p.user_id WHERE p.id = ?').get(info.lastInsertRowid);
    res.json({ post: created });
  } catch (e) {
    console.error('posts-public error', e);
    res.status(500).json({ error: 'server error' });
  }
});

// Public upvote endpoint (very naive, no duplicate protection)
app.post('/api/posts/:id/upvote', (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'bad id'});
    const voterKey = crypto.createHash('sha1').update(clientIp(req) + '|' + (req.headers['user-agent']||'')).digest('hex');
    // Attempt to record unique vote
    const voteStmt = db.prepare('INSERT INTO post_votes (post_id, voter_key) VALUES (?, ?)');
    let added = false;
    try { voteStmt.run(id, voterKey); added = true; } catch(e) { /* duplicate -> ignore */ }
    if (added) {
      const upd = db.prepare('UPDATE posts SET upvotes = upvotes + 1 WHERE id = ?').run(id);
      if (!upd.changes) return res.status(404).json({ error: 'not found' });
    } else {
      // ensure post exists
      const exists = db.prepare('SELECT 1 FROM posts WHERE id = ?').get(id);
      if (!exists) return res.status(404).json({ error: 'not found' });
    }
    const row = db.prepare('SELECT p.id, p.upvotes FROM posts p WHERE p.id = ?').get(id);
    res.json({ id: row.id, upvotes: row.upvotes, accepted: added });
  } catch (e) {
    console.error('upvote error', e);
    res.status(500).json({ error: 'server error' });
  }
});

// --- Admin utilities ---
function assertAdmin(req, res) {
  if (!req.user) { res.status(401).json({ error: 'auth required' }); return false; }
  const row = db.prepare('SELECT admin FROM users WHERE id = ?').get(req.user.id);
  if (!row || !row.admin) { res.status(403).json({ error: 'admin only' }); return false; }
  return true;
}

app.get('/api/admin/users', auth, (req, res) => {
  if (!assertAdmin(req, res)) return;
  const users = db.prepare('SELECT u.id, u.username, u.admin, u.created_at, (SELECT COUNT(1) FROM posts p WHERE p.user_id = u.id) as post_count FROM users u ORDER BY u.id ASC').all();
  res.json({ users });
});

app.get('/api/admin/posts', auth, (req, res) => {
  if (!assertAdmin(req, res)) return;
  const limit = Math.min(Number(req.query.limit || 500), 1000);
  const posts = db.prepare('SELECT p.*, u.username FROM posts p JOIN users u ON u.id = p.user_id ORDER BY p.id DESC LIMIT ?').all(limit);
  res.json({ posts });
});

app.delete('/api/admin/users/:id', auth, (req, res) => {
  if (!assertAdmin(req, res)) return;
  const targetId = Number(req.params.id);
  if (targetId === req.user.id) return res.status(400).json({ error: 'cannot delete self' });
  const del = db.prepare('DELETE FROM users WHERE id = ?').run(targetId);
  if (!del.changes) return res.status(404).json({ error: 'not found' });
  res.json({ success: true });
});

app.delete('/api/posts/:id', auth, (req, res) => {
  const { id } = req.params;
  const del = db.prepare('DELETE FROM posts WHERE id = ? AND user_id = ?').run(id, req.user.id);
  if (del.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Basic health endpoint for uptime / readiness checks
app.get('/healthz', (req, res) => {
  res.json({ ok: true, uptime: process.uptime(), timestamp: Date.now() });
});

// Therapist directory endpoint (demo) - serves therapists.json with simple in-memory cache
import fs from 'fs';
let therapistCache = { data: null, ts: 0 };
app.get('/api/therapists', (req,res) => {
  const now = Date.now();
  if (therapistCache.data && (now - therapistCache.ts) < 5*60*1000) {
    return res.json(therapistCache.data);
  }
  fs.readFile(path.join(__dirname,'therapists.json'),'utf8', (err, raw) => {
    if (err) { return res.status(500).json({ error: 'unavailable' }); }
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        therapistCache = { data: parsed, ts: now };
        return res.json(parsed);
      }
      return res.status(500).json({ error: 'invalid_format' });
    } catch (e) {
      return res.status(500).json({ error: 'parse_error' });
    }
  });
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
