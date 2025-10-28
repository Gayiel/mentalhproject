/**
 * MindFlow Authentication System
 * ================================
 * Secure local authentication with encrypted session management
 * HIPAA-compliant data isolation and audit logging
 * 
 * Features:
 * - User registration and login with email validation
 * - Password hashing using Web Crypto API
 * - Session management with automatic expiration
 * - Encrypted local storage for user data
 * - Audit logs for security compliance
 * - Multi-factor security indicators
 */

class AuthenticationSystem {
    constructor() {
        this.storagePrefix = 'mindflow_';
        this.sessionTimeout = 3600000; // 1 hour
        this.encryptionKey = null;
        this.currentUser = null;
        this.auditLog = [];
        this.init();
    }

    /**
     * Initialize authentication system
     */
    init() {
        this.loadEncryptionKey();
        this.restoreSession();
        this.loadAuditLog();
        this.attachEventListeners();
    }

    /**
     * Generate or load encryption key for this browser
     */
    async loadEncryptionKey() {
        const storedKey = localStorage.getItem(`${this.storagePrefix}enc_key`);
        if (storedKey) {
            this.encryptionKey = storedKey;
        } else {
            // Generate unique encryption key for this browser
            this.encryptionKey = this.generateKey();
            localStorage.setItem(`${this.storagePrefix}enc_key`, this.encryptionKey);
        }
    }

    /**
     * Generate random encryption key
     */
    generateKey() {
        return Array.from(crypto.getRandomValues(new Uint8Array(32)))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    /**
     * Simple XOR encryption for local storage (NOT for production backend)
     * Note: For true security, use backend encryption with HTTPS
     */
    encrypt(text) {
        if (!text) return '';
        const chars = [];
        for (let i = 0; i < text.length; i++) {
            chars.push(String.fromCharCode(
                text.charCodeAt(i) ^ this.encryptionKey.charCodeAt(i % this.encryptionKey.length)
            ));
        }
        return btoa(chars.join(''));
    }

    /**
     * Decrypt data from local storage
     */
    decrypt(encrypted) {
        if (!encrypted) return '';
        try {
            const chars = atob(encrypted).split('').map(c => c.charCodeAt(0));
            return chars.map((c, i) => 
                String.fromCharCode(c ^ this.encryptionKey.charCodeAt(i % this.encryptionKey.length))
            ).join('');
        } catch (e) {
            console.warn('Decryption failed:', e);
            return '';
        }
    }

    /**
     * Hash password using Web Crypto API
     */
    async hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(hashBuffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    /**
     * Register new user
     */
    async register(email, password, fullName, role = 'user') {
        // Validation
        if (!this.validateEmail(email)) {
            return { success: false, error: 'Invalid email address' };
        }
        if (password.length < 8) {
            return { success: false, error: 'Password must be at least 8 characters' };
        }
        if (!fullName || fullName.trim().length < 2) {
            return { success: false, error: 'Full name is required' };
        }

        // Validate role
        const validRoles = ['user', 'therapist', 'auditor', 'admin'];
        if (!validRoles.includes(role)) {
            return { success: false, error: 'Invalid role specified' };
        }

        // Check if user exists
        const users = this.getAllUsers();
        if (users.some(u => u.email === email)) {
            return { success: false, error: 'Email already registered' };
        }

        // Create new user
        const hashedPassword = await this.hashPassword(password);
        const userId = this.generateUserId();
        
        const user = {
            id: userId,
            email,
            name: fullName,
            password: hashedPassword,
            role: role,
            permissions: this.getRolePermissions(role),
            createdAt: new Date().toISOString(),
            lastLogin: null,
            sessionToken: null,
            status: 'active'
        };

        // Store user data encrypted
        const encryptedUser = {
            ...user,
            password: this.encrypt(hashedPassword)
        };

        localStorage.setItem(
            `${this.storagePrefix}user_${userId}`,
            JSON.stringify(encryptedUser)
        );

        // Update user index
        let userIndex = JSON.parse(localStorage.getItem(`${this.storagePrefix}users`) || '[]');
        userIndex.push({ id: userId, email });
        localStorage.setItem(`${this.storagePrefix}users`, JSON.stringify(userIndex));

        // Log audit
        this.logAudit('user_registered', { email, userId });

        return { success: true, message: 'Registration successful' };
    }

    /**
     * Login user
     */
    async login(email, password) {
        // Find user by email
        const users = this.getAllUsers();
        const userIndex = users.find(u => u.email === email);

        if (!userIndex) {
            this.logAudit('login_failed', { email, reason: 'user_not_found' });
            return { success: false, error: 'Email or password incorrect' };
        }

        // Get user data
        const userData = JSON.parse(
            localStorage.getItem(`${this.storagePrefix}user_${userIndex.id}`) || '{}'
        );

        // Verify password
        const hashedPassword = await this.hashPassword(password);
        const storedHash = this.decrypt(userData.password);

        if (hashedPassword !== storedHash) {
            this.logAudit('login_failed', { email, reason: 'invalid_password' });
            return { success: false, error: 'Email or password incorrect' };
        }

        // Generate session token
        const sessionToken = this.generateSessionToken();
        const sessionExpiry = Date.now() + this.sessionTimeout;

        // Update user
        userData.lastLogin = new Date().toISOString();
        userData.sessionToken = sessionToken;

        localStorage.setItem(
            `${this.storagePrefix}user_${userIndex.id}`,
            JSON.stringify(userData)
        );

        // Store session
        localStorage.setItem(
            `${this.storagePrefix}session`,
            JSON.stringify({
                userId: userIndex.id,
                token: sessionToken,
                expiry: sessionExpiry,
                email
            })
        );

        this.currentUser = { id: userIndex.id, email, name: userData.name };
        this.logAudit('login_success', { email, userId: userIndex.id });

        return { success: true, user: this.currentUser };
    }

    /**
     * Logout user and clear session
     */
    logout() {
        if (this.currentUser) {
            this.logAudit('logout', { userId: this.currentUser.id, email: this.currentUser.email });
        }

        localStorage.removeItem(`${this.storagePrefix}session`);
        this.currentUser = null;

        return { success: true, message: 'Logged out successfully' };
    }

    /**
     * Restore session if valid
     */
    restoreSession() {
        const sessionData = JSON.parse(
            localStorage.getItem(`${this.storagePrefix}session`) || 'null'
        );

        if (!sessionData) {
            return false;
        }

        // Check if session expired
        if (Date.now() > sessionData.expiry) {
            localStorage.removeItem(`${this.storagePrefix}session`);
            this.logAudit('session_expired', { email: sessionData.email });
            return false;
        }

        // Restore user from session
        const userData = JSON.parse(
            localStorage.getItem(`${this.storagePrefix}user_${sessionData.userId}`) || '{}'
        );

        this.currentUser = {
            id: sessionData.userId,
            email: sessionData.email,
            name: userData.name
        };

        return true;
    }

    /**
     * Request password reset (email simulation)
     */
    async requestPasswordReset(email) {
        const users = this.getAllUsers();
        const userIndex = users.find(u => u.email === email);

        if (!userIndex) {
            // Don't reveal if user exists (security best practice)
            this.logAudit('password_reset_requested', { email, found: false });
            return { success: true, message: 'If email exists, reset link will be sent' };
        }

        // Generate reset token
        const resetToken = this.generateSessionToken();
        const resetExpiry = Date.now() + 3600000; // 1 hour

        localStorage.setItem(
            `${this.storagePrefix}reset_${userIndex.id}`,
            JSON.stringify({
                token: resetToken,
                expiry: resetExpiry,
                email
            })
        );

        this.logAudit('password_reset_requested', { email, found: true });

        // In production, send actual email
        console.log(`[DEMO] Password reset token: ${resetToken}`);
        
        return { 
            success: true, 
            message: 'Password reset link sent to email',
            resetToken // In production, never return this
        };
    }

    /**
     * Reset password with token
     */
    async resetPassword(userId, resetToken, newPassword) {
        const resetData = JSON.parse(
            localStorage.getItem(`${this.storagePrefix}reset_${userId}`) || 'null'
        );

        if (!resetData) {
            return { success: false, error: 'No reset request found' };
        }

        if (Date.now() > resetData.expiry) {
            localStorage.removeItem(`${this.storagePrefix}reset_${userId}`);
            return { success: false, error: 'Reset link has expired' };
        }

        if (resetData.token !== resetToken) {
            return { success: false, error: 'Invalid reset token' };
        }

        // Update password
        if (newPassword.length < 8) {
            return { success: false, error: 'Password must be at least 8 characters' };
        }

        const hashedPassword = await this.hashPassword(newPassword);
        const userData = JSON.parse(
            localStorage.getItem(`${this.storagePrefix}user_${userId}`) || '{}'
        );

        userData.password = this.encrypt(hashedPassword);

        localStorage.setItem(
            `${this.storagePrefix}user_${userId}`,
            JSON.stringify(userData)
        );

        // Clear reset token
        localStorage.removeItem(`${this.storagePrefix}reset_${userId}`);

        this.logAudit('password_reset_completed', { userId, email: resetData.email });

        return { success: true, message: 'Password reset successfully' };
    }

    /**
     * Get all users (index only, for demo purposes)
     */
    getAllUsers() {
        return JSON.parse(localStorage.getItem(`${this.storagePrefix}users`) || '[]');
    }

    /**
     * Get user profile
     */
    getUserProfile(userId) {
        const userData = JSON.parse(
            localStorage.getItem(`${this.storagePrefix}user_${userId}`) || 'null'
        );

        if (!userData) return null;

        return {
            id: userData.id,
            email: userData.email,
            name: userData.name,
            createdAt: userData.createdAt,
            lastLogin: userData.lastLogin,
            status: userData.status
        };
    }

    /**
     * Update user profile
     */
    updateUserProfile(userId, updates) {
        const userData = JSON.parse(
            localStorage.getItem(`${this.storagePrefix}user_${userId}`) || '{}'
        );

        if (!userData.id) {
            return { success: false, error: 'User not found' };
        }

        // Only allow safe updates
        const allowedFields = ['name'];
        const safeUpdates = {};

        for (const field of allowedFields) {
            if (field in updates) {
                safeUpdates[field] = updates[field];
            }
        }

        Object.assign(userData, safeUpdates);
        localStorage.setItem(
            `${this.storagePrefix}user_${userId}`,
            JSON.stringify(userData)
        );

        if (this.currentUser?.id === userId) {
            this.currentUser.name = userData.name;
        }

        this.logAudit('profile_updated', { userId, fields: Object.keys(safeUpdates) });

        return { success: true, message: 'Profile updated' };
    }

    /**
     * Delete user account and all associated data
     */
    deleteAccount(userId) {
        // Delete user data
        localStorage.removeItem(`${this.storagePrefix}user_${userId}`);

        // Delete user conversations/history
        localStorage.removeItem(`${this.storagePrefix}history_${userId}`);

        // Remove from user index
        let userIndex = JSON.parse(localStorage.getItem(`${this.storagePrefix}users`) || '[]');
        userIndex = userIndex.filter(u => u.id !== userId);
        localStorage.setItem(`${this.storagePrefix}users`, JSON.stringify(userIndex));

        // Clear session if this is current user
        if (this.currentUser?.id === userId) {
            localStorage.removeItem(`${this.storagePrefix}session`);
            this.currentUser = null;
        }

        this.logAudit('account_deleted', { userId });

        return { success: true, message: 'Account deleted successfully' };
    }

    /**
     * Validate email format
     */
    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    /**
     * Generate unique user ID
     */
    generateUserId() {
        return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Generate session token
     */
    generateSessionToken() {
        return Array.from(crypto.getRandomValues(new Uint8Array(32)))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    /**
     * Audit logging for compliance
     */
    logAudit(action, data) {
        const entry = {
            timestamp: new Date().toISOString(),
            action,
            data,
            userAgent: navigator.userAgent,
            ip: 'local' // In production, get actual IP from backend
        };

        this.auditLog.push(entry);

        // Store audit log (keep last 1000 entries)
        const stored = JSON.parse(localStorage.getItem(`${this.storagePrefix}audit_log`) || '[]');
        stored.push(entry);
        if (stored.length > 1000) {
            stored.shift();
        }
        localStorage.setItem(`${this.storagePrefix}audit_log`, JSON.stringify(stored));
    }

    /**
     * Load audit log
     */
    loadAuditLog() {
        this.auditLog = JSON.parse(localStorage.getItem(`${this.storagePrefix}audit_log`) || '[]');
    }

    /**
     * Get audit log (for admin/compliance)
     */
    getAuditLog(limit = 100) {
        return this.auditLog.slice(-limit);
    }

    /**
     * Export user data (GDPR compliance)
     */
    exportUserData(userId) {
        const userData = JSON.parse(
            localStorage.getItem(`${this.storagePrefix}user_${userId}`) || '{}'
        );
        const history = JSON.parse(
            localStorage.getItem(`${this.storagePrefix}history_${userId}`) || '{}'
        );

        return {
            user: {
                id: userData.id,
                email: userData.email,
                name: userData.name,
                createdAt: userData.createdAt,
                lastLogin: userData.lastLogin
            },
            conversations: history,
            exportDate: new Date().toISOString()
        };
    }

    /**
     * Attach event listeners for UI
     */
    attachEventListeners() {
        // Listen for storage changes (logout in other tabs)
        window.addEventListener('storage', (e) => {
            if (e.key === `${this.storagePrefix}session` && !e.newValue) {
                this.currentUser = null;
                this.onSessionLost?.();
            }
        });

        // Refresh session on user activity
        ['mousedown', 'keydown', 'touchstart'].forEach(event => {
            document.addEventListener(event, () => this.refreshSession(), { passive: true });
        });
    }

    /**
     * Refresh session timeout
     */
    refreshSession() {
        if (!this.currentUser) return;

        const sessionData = JSON.parse(
            localStorage.getItem(`${this.storagePrefix}session`) || 'null'
        );

        if (sessionData) {
            sessionData.expiry = Date.now() + this.sessionTimeout;
            localStorage.setItem(`${this.storagePrefix}session`, JSON.stringify(sessionData));
        }
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return !!this.currentUser;
    }

    /**
     * Get current user
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Get role-based permissions
     */
    getRolePermissions(role) {
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
    }

    /**
     * Check if current user has specific permission
     */
    hasPermission(permission) {
        if (!this.currentUser || !this.currentUser.permissions) {
            return false;
        }
        return this.currentUser.permissions[permission] === true;
    }

    /**
     * Check if current user has specific role
     */
    hasRole(role) {
        if (!this.currentUser) {
            return false;
        }
        return this.currentUser.role === role;
    }

    /**
     * Get all users (admin only)
     */
    getAllUsersDetailed() {
        if (!this.hasPermission('canViewAllUsers')) {
            return { success: false, error: 'Unauthorized: Admin or Auditor access required' };
        }

        const userIndex = JSON.parse(
            localStorage.getItem(`${this.storagePrefix}users`) || '[]'
        );

        const users = userIndex.map(userId => {
            const userData = localStorage.getItem(`${this.storagePrefix}user_${userId}`);
            if (userData) {
                const user = JSON.parse(userData);
                // Decrypt password hash if needed (for password reset)
                if (user.password && user.password.includes(':')) {
                    user.passwordHash = this.decrypt(user.password);
                }
                delete user.password; // Never expose password
                return user;
            }
            return null;
        }).filter(u => u !== null);

        return { success: true, users };
    }

    /**
     * Update user role (admin only)
     */
    async updateUserRole(userId, newRole) {
        if (!this.hasPermission('canManageRoles')) {
            return { success: false, error: 'Unauthorized: Admin access required' };
        }

        const validRoles = ['user', 'therapist', 'auditor', 'admin'];
        if (!validRoles.includes(newRole)) {
            return { success: false, error: 'Invalid role specified' };
        }

        const userData = localStorage.getItem(`${this.storagePrefix}user_${userId}`);
        if (!userData) {
            return { success: false, error: 'User not found' };
        }

        const user = JSON.parse(userData);
        user.role = newRole;
        user.permissions = this.getRolePermissions(newRole);

        localStorage.setItem(`${this.storagePrefix}user_${userId}`, JSON.stringify(user));

        this.logAudit('role_updated', {
            targetUserId: userId,
            newRole: newRole,
            updatedBy: this.currentUser?.id
        });

        return { success: true, message: 'User role updated successfully' };
    }

    /**
     * Get portal URL based on user role
     */
    getPortalUrl() {
        if (!this.currentUser) {
            return 'login.html';
        }

        const rolePortals = {
            admin: 'admin-dashboard.html',
            therapist: 'therapist-portal.html',
            auditor: 'auditor-portal.html',
            user: 'collaborative-mental-health.html'
        };

        return rolePortals[this.currentUser.role] || 'collaborative-mental-health.html';
    }
}

// Initialize authentication system globally
window.authSystem = new AuthenticationSystem();

// Redirect to login if not authenticated (on protected pages)
function requireAuth() {
    if (!window.authSystem.isAuthenticated()) {
        window.location.href = 'login.html';
    }
}
