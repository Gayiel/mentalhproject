const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Database setup for MindFlow Sanctuary
class DatabaseManager {
    constructor() {
        this.dbPath = path.join(__dirname, '..', 'mindflow_sanctuary.db');
        this.db = null;
    }

    // Initialize database connection
    async initialize() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    console.error('Error opening database:', err.message);
                    reject(err);
                } else {
                    console.log('Connected to MindFlow Sanctuary database');
                    this.setupSchema().then(resolve).catch(reject);
                }
            });
        });
    }

    // Setup database schema
    async setupSchema() {
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        
        return new Promise((resolve, reject) => {
            this.db.exec(schema, (err) => {
                if (err) {
                    console.error('Error setting up schema:', err.message);
                    reject(err);
                } else {
                    console.log('Database schema setup complete');
                    resolve();
                }
            });
        });
    }

    // User management
    async createUser(userUuid, region = 'US') {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                INSERT INTO users (user_uuid, region, consent_given, last_active) 
                VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            `);
            stmt.run([userUuid, region, true], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
            stmt.finalize();
        });
    }

    // Conversation management
    async createConversation(userId, sessionUuid) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                INSERT INTO conversations (user_id, session_uuid, started_at) 
                VALUES (?, ?, CURRENT_TIMESTAMP)
            `);
            stmt.run([userId, sessionUuid], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
            stmt.finalize();
        });
    }

    // Message logging
    async logMessage(conversationId, messageType, content, emotionScore = null, crisisKeywords = null) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                INSERT INTO messages (conversation_id, message_type, content, emotion_score, crisis_keywords_detected, flagged_for_review) 
                VALUES (?, ?, ?, ?, ?, ?)
            `);
            const flagged = emotionScore > 80 || (crisisKeywords && crisisKeywords.length > 0);
            stmt.run([
                conversationId, 
                messageType, 
                content, 
                emotionScore, 
                crisisKeywords ? JSON.stringify(crisisKeywords) : null,
                flagged
            ], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
            stmt.finalize();
        });
    }

    // Crisis intervention logging
    async logCrisisIntervention(conversationId, userId, keywordsDetected, interventionType = 'automatic') {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                INSERT INTO crisis_interventions (conversation_id, user_id, intervention_type, keywords_detected) 
                VALUES (?, ?, ?, ?)
            `);
            stmt.run([
                conversationId, 
                userId, 
                interventionType, 
                JSON.stringify(keywordsDetected)
            ], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
            stmt.finalize();
        });
    }

    // Get platform metrics
    async getPlatformMetrics() {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT metric_name, metric_value, last_updated 
                FROM platform_metrics 
                ORDER BY metric_name
            `, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    const metrics = {};
                    rows.forEach(row => {
                        metrics[row.metric_name] = row.metric_value;
                    });
                    resolve(metrics);
                }
            });
        });
    }

    // Update platform metric
    async updateMetric(metricName, value) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                INSERT OR REPLACE INTO platform_metrics (metric_name, metric_value, last_updated) 
                VALUES (?, ?, CURRENT_TIMESTAMP)
            `);
            stmt.run([metricName, value], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes);
                }
            });
            stmt.finalize();
        });
    }

    // Get active counselors
    async getActiveCounselors() {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT counselor_uuid, name, specializations, status 
                FROM counselors 
                WHERE status = 'active' 
                ORDER BY last_active DESC
            `, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows.map(row => ({
                        ...row,
                        specializations: JSON.parse(row.specializations)
                    })));
                }
            });
        });
    }

    // Get today's analytics
    async getTodayAnalytics() {
        return new Promise((resolve, reject) => {
            this.db.get(`
                SELECT 
                    COUNT(DISTINCT u.id) as unique_users_today,
                    COUNT(DISTINCT c.id) as conversations_today,
                    COUNT(DISTINCT ci.id) as crisis_interventions_today,
                    AVG(m.emotion_score) as avg_emotion_score
                FROM users u
                LEFT JOIN conversations c ON u.id = c.user_id AND DATE(c.started_at) = DATE('now')
                LEFT JOIN crisis_interventions ci ON u.id = ci.user_id AND DATE(ci.triggered_at) = DATE('now')
                LEFT JOIN messages m ON c.id = m.conversation_id AND DATE(m.timestamp) = DATE('now')
                WHERE DATE(u.last_active) = DATE('now')
            `, (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    // Close database connection
    close() {
        if (this.db) {
            this.db.close((err) => {
                if (err) {
                    console.error('Error closing database:', err.message);
                } else {
                    console.log('Database connection closed');
                }
            });
        }
    }
}

module.exports = DatabaseManager;