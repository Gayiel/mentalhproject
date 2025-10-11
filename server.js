import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import initSqlJs from 'sql.js';
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
const DB_PATH = path.join(__dirname, 'mindflow_sanctuary.db');

let db;

// --- Database Initialization ---
async function initializeDatabase() {
    const SQL = await initSqlJs({
        locateFile: file => path.join(__dirname, 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm')
    });

    let fileBuffer;
    try {
        fileBuffer = fs.readFileSync(DB_PATH);
        console.log('[startup] Loaded existing database file.');
    } catch (e) {
        console.log('[startup] Database file not found, creating a new one.');
        fileBuffer = null;
    }

    db = new SQL.Database(fileBuffer);

    // Persist changes to disk after write operations
    const persist = () => {
        try {
            const data = db.export();
            const buffer = Buffer.from(data);
            fs.writeFileSync(DB_PATH, buffer);
        } catch (e) {
            console.error('[db] FATAL: Failed to save database to disk.', e);
        }
    };

    // --- API Helpers to mimic node-sqlite3/better-sqlite3 ---
    
    // Override exec to persist changes
    const originalExec = db.exec.bind(db);
    db.exec = (sql) => {
        const result = originalExec(sql);
        const command = sql.trim().toUpperCase().split(' ')[0];
        if (['INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER', 'PRAGMA'].includes(command)) {
            persist();
        }
        return result;
    };

    // Helper for single row fetching (get)
    db.get = (sql, params = []) => {
        const stmt = db.prepare(sql);
        stmt.bind(params);
        const result = stmt.step() ? stmt.getAsObject() : undefined;
        stmt.free();
        return result;
    };

    // Helper for multiple row fetching (all)
    db.all = (sql, params = []) => {
        const stmt = db.prepare(sql);
        const results = [];
        stmt.bind(params);
        while (stmt.step()) {
            results.push(stmt.getAsObject());
        }
        stmt.free();
        return results;
    };
    
    // Helper for running commands (run)
    db.run = (sql, params = []) => {
        db.prepare(sql).run(params);
        const changes = db.getRowsModified();
        const lastIdResult = db.get('SELECT last_insert_rowid() as id');
        persist();
        return { changes, lastInsertRowid: lastIdResult ? lastIdResult.id : undefined };
    };

    console.log('[startup] sql.js database initialized successfully.');
}

// --- Main Application Logic ---

const app = express();

function startServer() {
    app.use(cors());
    app.use(express.json({ limit: '1mb' }));
    app.use(express.static(__dirname));

    // --- API Endpoints ---
    setupApiRoutes();

    const server = app.listen(PORT, () => {
        console.log(`[server] Server listening on port ${PORT}.`);
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`[server] FATAL: Port ${PORT} is already in use. Please stop the other process or change the port.`);
        } else {
            console.error('[server] A server error occurred:', err);
        }
        process.exit(1);
    });
}

// Initialize and then start the server
// initializeDatabase().then(() => {
//     setupSchemaAndData();
    startServer();
// }).catch(err => {
//     console.error('[startup] FATAL: Could not initialize database.', err);
//     process.exit(1);
// });


function setupSchemaAndData() {
    console.log('[db] Setting up database schema and initial data...');
    db.exec('PRAGMA journal_mode = WAL');

    // MindFlow Sanctuary Database Schema
    db.exec(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT,
      password_hash TEXT NOT NULL,
      first_name TEXT,
      last_name TEXT,
      date_of_birth TEXT,
      phone_number TEXT,
      emergency_contact_name TEXT,
      emergency_contact_phone TEXT,
      consent_to_treatment BOOLEAN DEFAULT 0,
      privacy_consent BOOLEAN DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      admin INTEGER DEFAULT 0
    );`);

    db.exec(`CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      session_id TEXT UNIQUE NOT NULL,
      start_time TEXT DEFAULT CURRENT_TIMESTAMP,
      end_time TEXT,
      status TEXT DEFAULT 'active',
      crisis_level INTEGER DEFAULT 0,
      counselor_assigned_id INTEGER,
      session_notes TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(counselor_assigned_id) REFERENCES counselors(id)
    );`);

    db.exec(`CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL,
      sender_type TEXT NOT NULL,
      sender_id INTEGER,
      message_text TEXT NOT NULL,
      message_type TEXT DEFAULT 'text',
      sentiment_score REAL,
      crisis_keywords TEXT,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
      flagged_for_review BOOLEAN DEFAULT 0,
      FOREIGN KEY(conversation_id) REFERENCES conversations(id)
    );`);

    db.exec(`CREATE TABLE IF NOT EXISTS crisis_interventions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      conversation_id INTEGER NOT NULL,
      crisis_level INTEGER NOT NULL,
      intervention_type TEXT NOT NULL,
      counselor_id INTEGER,
      outcome TEXT,
      resources_provided TEXT,
      follow_up_scheduled TEXT,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
      resolved_at TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(conversation_id) REFERENCES conversations(id),
      FOREIGN KEY(counselor_id) REFERENCES counselors(id)
    );`);

    db.exec(`CREATE TABLE IF NOT EXISTS counselors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,  
      email TEXT UNIQUE NOT NULL,
      license_number TEXT UNIQUE NOT NULL,
      license_state TEXT NOT NULL,
      specialties TEXT,
      phone_number TEXT,
      status TEXT DEFAULT 'active',
      current_caseload INTEGER DEFAULT 0,
      max_caseload INTEGER DEFAULT 50,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );`);

    db.exec(`CREATE TABLE IF NOT EXISTS session_analytics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL,
      session_duration INTEGER,
      message_count INTEGER,
      avg_sentiment_score REAL,
      crisis_indicators_detected INTEGER DEFAULT 0,
      resources_accessed TEXT,
      user_satisfaction_rating INTEGER,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(conversation_id) REFERENCES conversations(id)
    );`);

    db.exec(`CREATE TABLE IF NOT EXISTS platform_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      total_users INTEGER DEFAULT 0,
      active_sessions INTEGER DEFAULT 0,
      crisis_interventions INTEGER DEFAULT 0,
      counselors_online INTEGER DEFAULT 0,
      avg_response_time REAL,
      user_satisfaction_avg REAL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );`);

    // Legacy support for posts and upvotes
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

    db.exec(`CREATE TABLE IF NOT EXISTS post_votes (
      post_id INTEGER NOT NULL,
      voter_key TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY(post_id, voter_key),
      FOREIGN KEY(post_id) REFERENCES posts(id) ON DELETE CASCADE
    );`);

    // Helpful indexes for MindFlow Sanctuary
    db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);');
    db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_session_id ON conversations(session_id);');
    db.exec('CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);');
    db.exec('CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp DESC);');
    db.exec('CREATE INDEX IF NOT EXISTS idx_crisis_interventions_user_id ON crisis_interventions(user_id);');
    db.exec('CREATE INDEX IF NOT EXISTS idx_crisis_interventions_timestamp ON crisis_interventions(timestamp DESC);');
    db.exec('CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);');
    db.exec('CREATE INDEX IF NOT EXISTS idx_posts_user_created ON posts(user_id, created_at DESC);');

    // Insert sample licensed counselors if table is empty
    const counselorCountResult = db.get('SELECT COUNT(*) as count FROM counselors');
    if (counselorCountResult && counselorCountResult.count === 0) {
        const counselors = [
            ['Dr. Sarah', 'Mitchell', 'smitchell@mindflowsanctuary.com', 'LPC-12345', 'CA', 'Anxiety, Depression, Trauma', '+1-555-0101', 23],
            ['Dr. James', 'Rodriguez', 'jrodriguez@mindflowsanctuary.com', 'LCSW-67890', 'NY', 'Crisis Intervention, PTSD', '+1-555-0102', 31],
            ['Dr. Emily', 'Chen', 'echen@mindflowsanctuary.com', 'LMF-11111', 'TX', 'Teen/Youth Mental Health', '+1-555-0103', 18],
            ['Dr. Michael', 'Thompson', 'mthompson@mindflowsanctuary.com', 'LPCC-22222', 'FL', 'Substance Abuse, Dual Diagnosis', '+1-555-0104', 27],
            ['Dr. Lisa', 'Patel', 'lpatel@mindflowsanctuary.com', 'LPC-33333', 'WA', 'Relationship Counseling, Family Therapy', '+1-555-0105', 22]
        ];
        counselors.forEach(c => {
            db.run(`INSERT INTO counselors (first_name, last_name, email, license_number, license_state, specialties, phone_number, current_caseload) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, c);
        });
        console.log('[db] Inserted sample licensed counselors');
    }

    // Initialize platform metrics if empty
    const metricsCountResult = db.get('SELECT COUNT(*) as count FROM platform_metrics');
    if (metricsCountResult && metricsCountResult.count === 0) {
        const today = new Date().toISOString().split('T')[0];
        db.run(`
            INSERT INTO platform_metrics (date, total_users, active_sessions, crisis_interventions, counselors_online, avg_response_time, user_satisfaction_avg) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [today, 3247, 847, 23, 1284, 2.3, 4.7]);
        console.log('[db] Initialized platform metrics');
    }
    
    ensureAnon();
    console.log('[db] Schema and data setup complete.');
}

// Ensure an anonymous user exists for public posting (non-auth)
let ANON_USER_ID;
function ensureAnon() {
    const row = db.get('SELECT id FROM users WHERE username = ?', ['anon']);
    if (row) {
        ANON_USER_ID = row.id;
        return row.id;
    }
    const hash = bcrypt.hashSync('anon_placeholder_pw', 8);
    const info = db.run('INSERT INTO users (username, password_hash, admin) VALUES (?,?,0)', ['anon', hash]);
    ANON_USER_ID = info.lastInsertRowid;
    console.log(`[startup] Anonymous user ID is ${ANON_USER_ID}`);
    return ANON_USER_ID;
}

function setupApiRoutes() {
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
        const row = db.get('SELECT COUNT(1) as c FROM users');
        const isFirst = row.c === 0;
        const hash = bcrypt.hashSync(password, 10);
        db.run('INSERT INTO users (username, password_hash, admin) VALUES (?, ?, ?)', [username, hash, isFirst ? 1 : 0]);
        return res.json({ success: true, firstUser: isFirst });
      } catch (err) {
        if (err.message.includes('UNIQUE')) return res.status(409).json({ error: 'Username already exists' });
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
      }
    });

    app.post('/api/login', (req, res) => {
      const { username, password } = req.body;
      if (!username || !password) return res.status(400).json({ error: 'username and password required' });
      try {
          const row = db.get('SELECT * FROM users WHERE username = ?', [username]);
          if (!row) return res.status(401).json({ error: 'Invalid credentials' });
          if (!bcrypt.compareSync(password, row.password_hash)) return res.status(401).json({ error: 'Invalid credentials' });
          const token = jwt.sign({ id: row.id, username: row.username, admin: !!row.admin }, JWT_SECRET, { expiresIn: '2h' });
          return res.json({ token });
      } catch (err) {
          console.error(err);
          return res.status(500).json({ error: 'Server error' });
      }
    });

    app.get('/api/me', auth, (req, res) => {
      try {
          const row = db.get('SELECT id, username, admin, created_at FROM users WHERE id = ?', [req.user.id]);
          res.json({ user: row });
      } catch (err) {
          console.error(err);
          return res.status(500).json({ error: 'Server error' });
      }
    });

    app.post('/api/posts', auth, (req, res) => {
      const { mood, tags, notes, conversation } = req.body;
      const params = [req.user.id, mood || null, Array.isArray(tags) ? tags.join(',') : '', notes || '', conversation ? JSON.stringify(conversation) : null];
      try {
          const info = db.run('INSERT INTO posts (user_id, mood, tags, notes, conversation_json) VALUES (?,?,?,?,?)', params);
          const created = db.get('SELECT * FROM posts WHERE id = ?', [info.lastInsertRowid]);
          res.json({ post: created });
      } catch (err) {
          console.error(err);
          return res.status(500).json({ error: 'Server error' });
      }
    });

    app.get('/api/posts', auth, (req, res) => {
      try {
          const rows = db.all('SELECT p.*, u.username FROM posts p JOIN users u ON u.id = p.user_id WHERE p.user_id = ? ORDER BY p.id DESC LIMIT 100', [req.user.id]);
          res.json({ posts: rows });
      } catch (err) {
          console.error(err);
          return res.status(500).json({ error: 'Server error' });
      }
    });

    app.get('/api/feed', auth, (req, res) => {
      try {
          const rows = db.all('SELECT p.*, u.username FROM posts p JOIN users u ON u.id = p.user_id ORDER BY p.id DESC LIMIT 200');
          res.json({ posts: rows });
      } catch (err) {
          console.error(err);
          return res.status(500).json({ error: 'Server error' });
      }
    });

    // Public (unauthenticated) read-only feed: limited fields, smaller limit
    app.get('/api/feed-public', (req, res) => {
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

        try {
            const rows = db.all(sql, params);
            const nextOffset = rows.length === lim ? off + lim : null;
            res.json({ posts: rows, nextOffset });
        } catch (err) {
            console.error('feed-public error', err);
            return res.status(500).json({ error: 'server error' });
        }
    });

    // Public create post (anonymous). Basic rate limit (in-memory) per IP.
    const rateMap = new Map();
    app.post('/api/posts-public', (req, res) => {
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

        const params = [ANON_USER_ID, values.mood || null, values.tags.join(','), values.notes];
        try {
            const info = db.run('INSERT INTO posts (user_id, mood, tags, notes) VALUES (?,?,?,?)', params);
            const created = db.get('SELECT p.id, p.mood, p.tags, p.notes, p.created_at, p.upvotes, u.username FROM posts p JOIN users u ON u.id = p.user_id WHERE p.id = ?', [info.lastInsertRowid]);
            res.json({ post: created });
        } catch (err) {
            console.error('posts-public error', err);
            return res.status(500).json({ error: 'server error' });
        }
    });

    // Public upvote endpoint (very naive, no duplicate protection)
    app.post('/api/posts/:id/upvote', (req, res) => {
        const id = Number(req.params.id);
        if (!Number.isInteger(id)) return res.status(400).json({ error: 'bad id'});
        const voterKey = crypto.createHash('sha1').update(clientIp(req) + '|' + (req.headers['user-agent']||'')).digest('hex');
        
        let added = false;
        try {
            db.run('INSERT INTO post_votes (post_id, voter_key) VALUES (?, ?)', [id, voterKey]);
            added = true;
            db.run('UPDATE posts SET upvotes = upvotes + 1 WHERE id = ?', [id]);
        } catch (err) {
            if (!err.message.includes('UNIQUE')) {
                console.error('upvote insert error', err);
                return res.status(500).json({ error: 'server error' });
            }
            // It's a duplicate vote, ignore the error and continue
        }

        try {
            const row = db.get('SELECT id, upvotes FROM posts WHERE id = ?', [id]);
            if (!row) return res.status(404).json({ error: 'not found' });
            res.json({ id: row.id, upvotes: row.upvotes, accepted: added });
        } catch (getErr) {
            console.error('upvote get error', getErr);
            return res.status(500).json({ error: 'server error' });
        }
    });

    // --- Admin utilities ---
    function assertAdmin(req, res, callback) {
      if (!req.user) { 
        res.status(401).json({ error: 'auth required' }); 
        return callback(false); 
      }
      try {
          const row = db.get('SELECT admin FROM users WHERE id = ?', [req.user.id]);
          if (!row || !row.admin) {
              res.status(403).json({ error: 'admin only' });
              return callback(false);
          }
          callback(true);
      } catch (err) {
          res.status(500).json({ error: 'server error' });
          return callback(false);
      }
    }

    app.get('/api/admin/users', auth, (req, res) => {
      assertAdmin(req, res, (isAdmin) => {
        if (!isAdmin) return;
        try {
            const users = db.all('SELECT u.id, u.username, u.admin, u.created_at, (SELECT COUNT(1) FROM posts p WHERE p.user_id = u.id) as post_count FROM users u ORDER BY u.id ASC');
            res.json({ users });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: 'server error' });
        }
      });
    });

    app.get('/api/admin/posts', auth, (req, res) => {
      assertAdmin(req, res, (isAdmin) => {
        if (!isAdmin) return;
        const limit = Math.min(Number(req.query.limit || 500), 1000);
        try {
            const posts = db.all('SELECT p.*, u.username FROM posts p JOIN users u ON u.id = p.user_id ORDER BY p.id DESC LIMIT ?', [limit]);
            res.json({ posts });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: 'server error' });
        }
      });
    });

    app.delete('/api/admin/users/:id', auth, (req, res) => {
      assertAdmin(req, res, (isAdmin) => {
        if (!isAdmin) return;
        const targetId = Number(req.params.id);
        if (targetId === req.user.id) return res.status(400).json({ error: 'cannot delete self' });
        try {
            const info = db.run('DELETE FROM users WHERE id = ?', [targetId]);
            if (info.changes === 0) return res.status(404).json({ error: 'not found' });
            res.json({ success: true });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: 'server error' });
        }
      });
    });

    app.delete('/api/posts/:id', auth, (req, res) => {
      const { id } = req.params;
      try {
          const info = db.run('DELETE FROM posts WHERE id = ? AND user_id = ?', [id, req.user.id]);
          if (info.changes === 0) return res.status(404).json({ error: 'Not found' });
          res.json({ success: true });
      } catch (err) {
          console.error(err);
          return res.status(500).json({ error: 'server error' });
      }
    });

    app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, 'index.html'));
    });

    // Basic health endpoint for uptime / readiness checks
    app.get('/healthz', (req, res) => {
      res.json({ ok: true, uptime: process.uptime(), timestamp: Date.now() });
    });

    // MindFlow Sanctuary API endpoints
    app.get('/api/sanctuary/metrics', (req, res) => {
        try {
            const metrics = db.get(`
              SELECT total_users, active_sessions, crisis_interventions, counselors_online, 
                     avg_response_time, user_satisfaction_avg 
              FROM platform_metrics 
              ORDER BY date DESC LIMIT 1
            `);
            if (!metrics) {
              return res.json({
                total_users: 0,
                active_sessions: 0, 
                crisis_interventions: 0,
                counselors_online: 0,
                avg_response_time: 0,
                user_satisfaction_avg: 0
              });
            }
            res.json(metrics);
        } catch (err) {
            console.error('metrics error', err);
            return res.status(500).json({ error: 'server error' });
        }
    });

    app.get('/api/sanctuary/counselors', (req, res) => {
        try {
            const counselors = db.all(`
              SELECT first_name, last_name, specialties, current_caseload, max_caseload, status
              FROM counselors 
              WHERE status = 'active'
              ORDER BY first_name
            `);
            res.json({ counselors });
        } catch (err) {
            console.error('counselors error', err);
            return res.status(500).json({ error: 'server error' });
        }
    });

    app.get('/api/therapists', (req, res) => {
        try {
            const counselors = db.all(`
              SELECT id, first_name, last_name, specialties, status
              FROM counselors 
              WHERE status = 'active'
              ORDER BY first_name
            `);

            const therapists = counselors.map((c, index) => ({
              id: c.id,
              name: `${c.first_name} ${c.last_name}`,
              focus: c.specialties ? c.specialties.split(',').map(s => s.trim()) : [],
              remote: index % 2 === 0, 
              modality: 'Cognitive Behavioral Therapy (CBT)',
              slots: (c.id % 5) + 1,
              availability: 'Accepting new clients'
            }));

            res.json(therapists);
        } catch (err) {
            console.error('therapists api error', err);
            return res.status(500).json({ error: 'server error' });
        }
    });

    app.post('/api/sanctuary/conversation', (req, res) => {
        const sessionId = crypto.randomUUID();
        // In a real app, user_id would come from an authenticated session (req.user.id)
        // For this demo, we'll assume an anonymous or placeholder user
        const userId = req.body.anonymous ? ANON_USER_ID : (req.user?.id || ANON_USER_ID); 
        
        try {
            const info = db.run(`
              INSERT INTO conversations (user_id, session_id, status) 
              VALUES (?, ?, 'active')
            `, [userId, sessionId]);
            res.json({ 
              conversation_id: info.lastInsertRowid,
              session_id: sessionId,
              status: 'active'
            });
        } catch (err) {
            console.error('conversation creation error', err);
            return res.status(500).json({ error: 'server error' });
        }
    });
}
