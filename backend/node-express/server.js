// MindFlow - Node.js Express Backend
// Healthcare-grade REST API with TypeScript support

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(express.json());
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*'
}));

// Database setup (SQLite for dev, PostgreSQL for production)
const sequelize = new Sequelize(
    process.env.DATABASE_URL || 'sqlite:mindflow.db',
    {
        logging: false,
        dialectOptions: process.env.DATABASE_URL?.includes('postgres') ? {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        } : {}
    }
);

// Models
const User = sequelize.define('User', {
    id: {
        type: DataTypes.STRING,
        primaryKey: true
    },
    email: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
        validate: {
            isEmail: true
        }
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    passwordHash: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'password_hash'
    },
    role: {
        type: DataTypes.ENUM('user', 'therapist', 'auditor', 'admin'),
        defaultValue: 'user',
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('active', 'inactive'),
        defaultValue: 'active',
        allowNull: false
    },
    lastLogin: {
        type: DataTypes.DATE,
        field: 'last_login'
    }
}, {
    tableName: 'users',
    underscored: true,
    timestamps: true
});

const Conversation = sequelize.define('Conversation', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    userId: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'user_id'
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    response: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    isCrisis: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'is_crisis'
    },
    sentiment: {
        type: DataTypes.STRING
    }
}, {
    tableName: 'conversations',
    underscored: true,
    timestamps: true
});

const AuditLog = sequelize.define('AuditLog', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    userId: {
        type: DataTypes.STRING,
        field: 'user_id'
    },
    action: {
        type: DataTypes.STRING,
        allowNull: false
    },
    details: {
        type: DataTypes.TEXT
    },
    ipAddress: {
        type: DataTypes.STRING,
        field: 'ip_address'
    },
    userAgent: {
        type: DataTypes.STRING(500),
        field: 'user_agent'
    }
}, {
    tableName: 'audit_logs',
    underscored: true,
    timestamps: true,
    createdAt: 'timestamp',
    updatedAt: false
});

// Associations
User.hasMany(Conversation, { foreignKey: 'userId', onDelete: 'CASCADE' });
Conversation.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(AuditLog, { foreignKey: 'userId' });
AuditLog.belongsTo(User, { foreignKey: 'userId' });

// Helper Functions
const generateToken = (userId) => {
    return jwt.sign(
        { userId },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '1h' }
    );
};

const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ success: false, error: 'No token provided' });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        req.userId = decoded.userId;
        next();
    } catch (error) {
        return res.status(401).json({ success: false, error: 'Invalid token' });
    }
};

const logAudit = async (action, userId = null, details = null, req) => {
    try {
        await AuditLog.create({
            userId,
            action,
            details,
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.headers['user-agent']
        });
    } catch (error) {
        console.error('Audit log error:', error);
    }
};

const getRolePermissions = (role) => {
    const permissions = {
        admin: {
            canViewAllUsers: true,
            canEditUsers: true,
            canDeleteUsers: true,
            canViewAuditLogs: true,
            canManageRoles: true,
            canAccessAdminPanel: true,
            canViewCrisisAlerts: true,
            canManageResources: true,
            canExportData: true,
            canConfigureSystem: true
        },
        therapist: {
            canViewAllUsers: false,
            canEditUsers: false,
            canDeleteUsers: false,
            canViewAuditLogs: false,
            canManageRoles: false,
            canAccessAdminPanel: false,
            canViewCrisisAlerts: true,
            canManageResources: true,
            canExportData: false,
            canConfigureSystem: false,
            canViewAssignedClients: true,
            canUpdateClientNotes: true,
            canAccessTherapistPortal: true
        },
        auditor: {
            canViewAllUsers: true,
            canEditUsers: false,
            canDeleteUsers: false,
            canViewAuditLogs: true,
            canManageRoles: false,
            canAccessAdminPanel: false,
            canViewCrisisAlerts: true,
            canManageResources: false,
            canExportData: true,
            canConfigureSystem: false,
            canAccessAuditorPortal: true,
            canGenerateReports: true
        },
        user: {
            canViewAllUsers: false,
            canEditUsers: false,
            canDeleteUsers: false,
            canViewAuditLogs: false,
            canManageRoles: false,
            canAccessAdminPanel: false,
            canViewCrisisAlerts: false,
            canManageResources: false,
            canExportData: false,
            canConfigureSystem: false,
            canAccessUserApp: true,
            canChatWithAI: true
        }
    };
    return permissions[role] || permissions.user;
};

// Routes

app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password, name, role = 'user' } = req.body;
        
        // Validation
        if (!email || !password || !name) {
            return res.status(400).json({ success: false, error: 'Email, password, and name are required' });
        }
        
        if (password.length < 8) {
            return res.status(400).json({ success: false, error: 'Password must be at least 8 characters' });
        }
        
        const validRoles = ['user', 'therapist', 'auditor', 'admin'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ success: false, error: 'Invalid role' });
        }
        
        // Check if user exists
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(409).json({ success: false, error: 'Email already registered' });
        }
        
        // Create user
        const userId = require('crypto').randomBytes(16).toString('hex');
        const passwordHash = await bcrypt.hash(password, 10);
        
        const user = await User.create({
            id: userId,
            email,
            name,
            passwordHash,
            role
        });
        
        await logAudit('user_registered', userId, `Role: ${role}`, req);
        
        res.status(201).json({
            success: true,
            message: 'Registration successful',
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                permissions: getRolePermissions(user.role)
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ success: false, error: 'Registration failed' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'Email and password are required' });
        }
        
        const user = await User.findOne({ where: { email } });
        
        if (!user || !await bcrypt.compare(password, user.passwordHash)) {
            await logAudit('login_failed', null, `Email: ${email}`, req);
            return res.status(401).json({ success: false, error: 'Invalid email or password' });
        }
        
        if (user.status !== 'active') {
            return res.status(403).json({ success: false, error: 'Account is inactive' });
        }
        
        // Update last login
        await user.update({ lastLogin: new Date() });
        
        const token = generateToken(user.id);
        
        await logAudit('login_success', user.id, null, req);
        
        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                permissions: getRolePermissions(user.role)
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, error: 'Login failed' });
    }
});

app.get('/api/auth/me', verifyToken, async (req, res) => {
    try {
        const user = await User.findByPk(req.userId);
        
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        
        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                permissions: getRolePermissions(user.role)
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to get user' });
    }
});

app.get('/api/users', verifyToken, async (req, res) => {
    try {
        const currentUser = await User.findByPk(req.userId);
        
        if (!currentUser || !['admin', 'auditor'].includes(currentUser.role)) {
            return res.status(403).json({ success: false, error: 'Unauthorized' });
        }
        
        const users = await User.findAll({
            attributes: { exclude: ['passwordHash'] }
        });
        
        res.json({
            success: true,
            users: users.map(u => ({
                id: u.id,
                email: u.email,
                name: u.name,
                role: u.role,
                status: u.status,
                createdAt: u.createdAt,
                lastLogin: u.lastLogin,
                permissions: getRolePermissions(u.role)
            }))
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to get users' });
    }
});

app.put('/api/users/:userId', verifyToken, async (req, res) => {
    try {
        const currentUser = await User.findByPk(req.userId);
        
        if (!currentUser || currentUser.role !== 'admin') {
            return res.status(403).json({ success: false, error: 'Unauthorized' });
        }
        
        const user = await User.findByPk(req.params.userId);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        
        const { role, status, name } = req.body;
        const updates = {};
        
        if (role) updates.role = role;
        if (status) updates.status = status;
        if (name) updates.name = name;
        
        await user.update(updates);
        await logAudit('user_updated', req.userId, `Updated user ${user.id}`, req);
        
        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                status: user.status
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to update user' });
    }
});

app.delete('/api/users/:userId', verifyToken, async (req, res) => {
    try {
        const currentUser = await User.findByPk(req.userId);
        
        if (!currentUser || currentUser.role !== 'admin') {
            return res.status(403).json({ success: false, error: 'Unauthorized' });
        }
        
        if (req.params.userId === req.userId) {
            return res.status(400).json({ success: false, error: 'Cannot delete your own account' });
        }
        
        const user = await User.findByPk(req.params.userId);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        
        await user.destroy();
        await logAudit('user_deleted', req.userId, `Deleted user ${user.id}`, req);
        
        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to delete user' });
    }
});

app.post('/api/conversations', verifyToken, async (req, res) => {
    try {
        const { message, response, isCrisis, sentiment } = req.body;
        
        const conversation = await Conversation.create({
            userId: req.userId,
            message,
            response,
            isCrisis: isCrisis || false,
            sentiment
        });
        
        if (isCrisis) {
            await logAudit('crisis_detected', req.userId, 'Crisis language detected', req);
        }
        
        res.status(201).json({
            success: true,
            conversation
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to save conversation' });
    }
});

app.get('/api/conversations', verifyToken, async (req, res) => {
    try {
        const conversations = await Conversation.findAll({
            where: { userId: req.userId },
            order: [['createdAt', 'DESC']]
        });
        
        res.json({
            success: true,
            conversations
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to get conversations' });
    }
});

app.get('/api/audit-logs', verifyToken, async (req, res) => {
    try {
        const currentUser = await User.findByPk(req.userId);
        
        if (!currentUser || !['admin', 'auditor'].includes(currentUser.role)) {
            return res.status(403).json({ success: false, error: 'Unauthorized' });
        }
        
        const limit = parseInt(req.query.limit) || 100;
        
        const logs = await AuditLog.findAll({
            order: [['timestamp', 'DESC']],
            limit
        });
        
        res.json({
            success: true,
            logs
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to get audit logs' });
    }
});

app.get('/api/stats', verifyToken, async (req, res) => {
    try {
        const currentUser = await User.findByPk(req.userId);
        
        if (!currentUser || currentUser.role !== 'admin') {
            return res.status(403).json({ success: false, error: 'Unauthorized' });
        }
        
        const totalUsers = await User.count();
        const totalTherapists = await User.count({ where: { role: 'therapist' } });
        const totalAuditors = await User.count({ where: { role: 'auditor' } });
        const totalConversations = await Conversation.count();
        
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        const crisisCount = await Conversation.count({
            where: {
                isCrisis: true,
                createdAt: { [Sequelize.Op.gte]: yesterday }
            }
        });
        
        res.json({
            success: true,
            stats: {
                totalUsers,
                totalTherapists,
                totalAuditors,
                totalConversations,
                crisisAlerts24h: crisisCount
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to get stats' });
    }
});

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ success: false, error: 'Internal server error' });
});

// Initialize database and start server
sequelize.sync().then(() => {
    console.log('Database synced successfully!');
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}).catch(err => {
    console.error('Database sync error:', err);
});
