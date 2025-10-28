# 🚀 Backend Integration Guide - MindFlow

Complete guide for integrating Python Flask, Node.js Express, or TypeScript backends with your MindFlow platform.

---

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Python Flask Backend](#python-flask-backend)
3. [Node.js Express Backend](#nodejs-express-backend)
4. [TypeScript Integration](#typescript-integration)
5. [Frontend Integration](#frontend-integration)
6. [Database Setup](#database-setup)
7. [Deployment](#deployment)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 Quick Start

You now have **THREE backend options**:

| Backend | Best For | Setup Time | Database |
|---------|----------|------------|----------|
| **Python Flask** | Healthcare/ML | 15 min | PostgreSQL/SQLite |
| **Node.js Express** | Real-time/Fast | 10 min | MongoDB/PostgreSQL |
| **Current (localStorage)** | Demo/MVP | 0 min | Browser only |

---

## 🐍 Python Flask Backend

### Installation

**Step 1: Navigate to backend folder**
```bash
cd backend/python-flask
```

**Step 2: Create virtual environment**
```bash
python -m venv venv

# Windows:
venv\Scripts\activate

# Mac/Linux:
source venv/bin/activate
```

**Step 3: Install dependencies**
```bash
pip install -r requirements.txt
```

**Step 4: Setup environment**
```bash
# Copy example env file
copy .env.example .env

# Edit .env and set your secrets
notepad .env
```

**Step 5: Run server**
```bash
python app.py
```

**✅ Server running at: http://localhost:5000**

### Features

✅ **HIPAA-Compliant Database** - PostgreSQL with encryption
✅ **JWT Authentication** - Secure token-based auth
✅ **Role-Based Access Control** - Admin/Therapist/Auditor/User
✅ **Audit Logging** - Complete compliance trail
✅ **SQLAlchemy ORM** - Type-safe database queries
✅ **RESTful API** - Standard HTTP endpoints

### API Endpoints

```
POST   /api/auth/register     - Create new user
POST   /api/auth/login        - Login and get token
GET    /api/auth/me           - Get current user
GET    /api/users             - List all users (admin)
PUT    /api/users/:id         - Update user (admin)
DELETE /api/users/:id         - Delete user (admin)
POST   /api/conversations     - Save conversation
GET    /api/conversations     - Get user conversations
GET    /api/audit-logs        - Get audit logs (admin/auditor)
GET    /api/stats             - Get system stats (admin)
GET    /api/health            - Health check
```

### Database Migration

**Switch from SQLite to PostgreSQL:**

```bash
# Install PostgreSQL locally or use cloud provider

# Update .env:
DATABASE_URL=postgresql://username:password@localhost:5432/mindflow

# Run migrations
python app.py
```

---

## 🟢 Node.js Express Backend

### Installation

**Step 1: Navigate to backend folder**
```bash
cd backend/node-express
```

**Step 2: Install dependencies**
```bash
npm install
```

**Step 3: Setup environment**
```bash
# Copy example env file
copy .env.example .env

# Edit .env
notepad .env
```

**Step 4: Run server**
```bash
# Development with auto-reload:
npm run dev

# Production:
npm start
```

**✅ Server running at: http://localhost:5001**

### Features

✅ **Fast Performance** - Async/await throughout
✅ **Sequelize ORM** - Multi-database support
✅ **JWT Auth** - Industry standard
✅ **WebSocket Ready** - Add real-time features
✅ **TypeScript Support** - Type safety available

### API Endpoints

Same as Python Flask (identical REST API)

### Database Options

**SQLite (Development):**
```javascript
DATABASE_URL=sqlite:mindflow.db
```

**PostgreSQL (Production):**
```javascript
DATABASE_URL=postgresql://user:pass@localhost:5432/mindflow
```

**MongoDB (Alternative):**
```javascript
// Install mongoose
npm install mongoose

// Update server.js to use MongoDB
```

---

## 📘 TypeScript Integration

### Enable TypeScript

**Step 1: Install TypeScript**
```bash
npm install --save-dev typescript @types/node
```

**Step 2: TypeScript config already created**
```bash
# tsconfig.json is ready!
```

**Step 3: Convert JavaScript files**

**Example: auth-system.js → auth-system.ts**

```typescript
// Before (JavaScript):
class AuthenticationSystem {
    constructor() {
        this.currentUser = null;
    }
}

// After (TypeScript):
import { User, UserRole, AuthResponse } from '../types';

class AuthenticationSystem implements IAuthenticationSystem {
    private currentUser: User | null = null;
    private storagePrefix: string = 'mindflow_';
    
    async register(
        email: string,
        password: string,
        fullName: string,
        role: UserRole = 'user'
    ): Promise<AuthResponse> {
        // Type-safe implementation
    }
}
```

**Step 4: Compile TypeScript**
```bash
# Compile all .ts files to .js
npx tsc

# Watch mode (auto-compile on changes)
npx tsc --watch
```

### Benefits

✅ **Catch Errors Early** - Compile-time error detection
✅ **Better IDE Support** - Autocomplete everything
✅ **Refactor Safely** - Rename variables with confidence
✅ **Documentation** - Types serve as docs

---

## 🔗 Frontend Integration

### Option 1: Switch to Backend API (Recommended)

**Update `js/auth-system.js` to use API:**

```javascript
class AuthenticationSystem {
    constructor() {
        this.apiUrl = 'http://localhost:5000/api'; // Flask
        // OR: 'http://localhost:5001/api' for Node.js
        this.token = localStorage.getItem('mindflow_token');
    }
    
    async register(email, password, fullName, role = 'user') {
        const response = await fetch(`${this.apiUrl}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, name: fullName, role })
        });
        
        const data = await response.json();
        
        if (data.success && data.token) {
            this.token = data.token;
            localStorage.setItem('mindflow_token', data.token);
            this.currentUser = data.user;
        }
        
        return data;
    }
    
    async login(email, password) {
        const response = await fetch(`${this.apiUrl}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (data.success && data.token) {
            this.token = data.token;
            localStorage.setItem('mindflow_token', data.token);
            this.currentUser = data.user;
        }
        
        return data;
    }
    
    async getAllUsersDetailed() {
        const response = await fetch(`${this.apiUrl}/users`, {
            headers: {
                'Authorization': `Bearer ${this.token}`
            }
        });
        
        return await response.json();
    }
    
    // ... other methods similar
}
```

### Option 2: Keep LocalStorage (Current)

No changes needed! Current system works perfectly for demo/MVP.

### Option 3: Hybrid Approach

```javascript
class AuthenticationSystem {
    constructor() {
        this.useBackend = !!process.env.REACT_APP_API_URL;
        this.apiUrl = process.env.REACT_APP_API_URL || null;
        this.token = localStorage.getItem('mindflow_token');
    }
    
    async register(email, password, fullName, role = 'user') {
        if (this.useBackend) {
            return this.registerAPI(email, password, fullName, role);
        } else {
            return this.registerLocalStorage(email, password, fullName, role);
        }
    }
    
    // ... implement both versions
}
```

---

## 🗄️ Database Setup

### SQLite (Development)

✅ **Already configured** - No setup needed!

### PostgreSQL (Production)

**Windows:**
```bash
# Download PostgreSQL installer
https://www.postgresql.org/download/windows/

# Install and create database
createdb mindflow
```

**Mac:**
```bash
brew install postgresql
brew services start postgresql
createdb mindflow
```

**Linux:**
```bash
sudo apt-get install postgresql
sudo -u postgres createdb mindflow
```

**Update .env:**
```bash
DATABASE_URL=postgresql://username:password@localhost:5432/mindflow
```

### Cloud Database (Recommended for Production)

**Option 1: Supabase (Free PostgreSQL)**
```bash
# Sign up at supabase.com
# Create project
# Copy connection string to .env
DATABASE_URL=postgresql://postgres:password@db.xxx.supabase.co:5432/postgres
```

**Option 2: Railway**
```bash
# Sign up at railway.app
# Create PostgreSQL service
# Copy connection string
```

**Option 3: Heroku Postgres**
```bash
heroku addons:create heroku-postgresql:hobby-dev
heroku config:get DATABASE_URL
```

---

## 🚀 Deployment

### Deploy Python Flask

**Heroku:**
```bash
# Create Procfile
echo "web: gunicorn app:app" > Procfile

# Deploy
heroku create mindflow-backend
git push heroku main
```

**Railway:**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Deploy
railway init
railway up
```

### Deploy Node.js Express

**Vercel:**
```bash
npm install -g vercel
vercel
```

**Render:**
```bash
# Connect GitHub repo at render.com
# Auto-deploys on push
```

### Frontend (GitHub Pages / Netlify)

```bash
# Netlify
npm install -g netlify-cli
netlify deploy --prod

# GitHub Pages
# Push to gh-pages branch
```

---

## 🐛 Troubleshooting

### CORS Errors

**Python Flask:**
```python
# app.py already configured!
CORS(app, resources={r"/api/*": {"origins": "*"}})
```

**Node.js:**
```javascript
// server.js already configured!
app.use(cors({ origin: '*' }));
```

### Database Connection Errors

```bash
# Check PostgreSQL is running:
pg_isready

# Test connection:
psql -U username -d mindflow
```

### Port Already in Use

```bash
# Windows:
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Mac/Linux:
lsof -i :5000
kill -9 <PID>
```

### Token Expired

```javascript
// Frontend: Auto-refresh token
if (response.status === 401) {
    // Redirect to login
    window.location.href = 'login.html';
}
```

---

## 📊 Performance Comparison

| Feature | LocalStorage | Python Flask | Node.js |
|---------|--------------|--------------|---------|
| **Speed** | ⚡ Instant | 🟢 Fast | ⚡ Very Fast |
| **Scalability** | ❌ Limited | ✅ Excellent | ✅ Excellent |
| **HIPAA** | ⚠️ Browser-only | ✅ Compliant | ✅ Compliant |
| **Multi-user** | ❌ No | ✅ Yes | ✅ Yes |
| **Real-time** | ❌ No | ⚠️ Polling | ✅ WebSockets |
| **Deployment** | ✅ Easy | 🟢 Moderate | 🟢 Moderate |

---

## 🎯 Recommendations

**For MVP/Demo:**
- ✅ Keep current localStorage system
- No backend needed
- Deploy as static site

**For Small Clinic (< 100 users):**
- ✅ Use Node.js Express
- Deploy on Railway/Render (free tier)
- PostgreSQL database

**For Healthcare Organization:**
- ✅ Use Python Flask
- Dedicated server or AWS/Azure
- PostgreSQL with encryption
- HIPAA compliance audit

**For Enterprise/Scale:**
- ✅ Python Flask + Redis
- Kubernetes cluster
- Separate database server
- Load balancer

---

## 🔐 Security Checklist

Before production:

- [ ] Change all default secrets in `.env`
- [ ] Enable HTTPS (SSL certificate)
- [ ] Set up database backups
- [ ] Configure firewall rules
- [ ] Enable rate limiting
- [ ] Add input validation
- [ ] Set up monitoring (Sentry, etc.)
- [ ] Review CORS settings
- [ ] Enable database encryption
- [ ] Set up audit log rotation

---

## 📚 Next Steps

1. **Choose your backend** (Flask or Node.js)
2. **Install dependencies** (10 minutes)
3. **Test API endpoints** (Postman/Insomnia)
4. **Update frontend** (Optional - current works!)
5. **Deploy to production** (Follow deployment guide)

---

**Questions? Check the code comments or create an issue on GitHub!**

**Ready to deploy? You're now production-ready!** 🎉
