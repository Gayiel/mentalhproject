-- MindFlow Sanctuary Database Schema
-- Mental Health Platform Database Structure

-- Users table for platform users
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_uuid TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
    region TEXT DEFAULT 'US',
    consent_given BOOLEAN DEFAULT FALSE,
    privacy_preferences TEXT, -- JSON string
    is_active BOOLEAN DEFAULT TRUE
);

-- Conversations table for chat sessions
CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    session_uuid TEXT UNIQUE NOT NULL,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ended_at DATETIME,
    status TEXT DEFAULT 'active', -- active, completed, crisis, escalated
    human_counselor_involved BOOLEAN DEFAULT FALSE,
    crisis_detected BOOLEAN DEFAULT FALSE,
    satisfaction_rating INTEGER, -- 1-5 scale
    FOREIGN KEY (user_id) REFERENCES users (id)
);

-- Messages table for individual chat messages
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER,
    message_type TEXT NOT NULL, -- user, bot, human, system
    content TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    emotion_score INTEGER, -- 0-100 scale
    crisis_keywords_detected TEXT, -- JSON array of detected keywords
    flagged_for_review BOOLEAN DEFAULT FALSE,
    counselor_reviewed BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (conversation_id) REFERENCES conversations (id)
);

-- Crisis interventions table
CREATE TABLE IF NOT EXISTS crisis_interventions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER,
    user_id INTEGER,
    triggered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    intervention_type TEXT, -- automatic, human_escalation, emergency_services
    keywords_detected TEXT, -- JSON array
    resolution_status TEXT DEFAULT 'pending', -- pending, resolved, ongoing
    counselor_assigned TEXT,
    follow_up_scheduled DATETIME,
    FOREIGN KEY (conversation_id) REFERENCES conversations (id),
    FOREIGN KEY (user_id) REFERENCES users (id)
);

-- Counselors table for licensed professionals
CREATE TABLE IF NOT EXISTS counselors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    counselor_uuid TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    license_number TEXT NOT NULL,
    license_state TEXT NOT NULL,
    specializations TEXT, -- JSON array
    status TEXT DEFAULT 'active', -- active, inactive, busy
    max_concurrent_sessions INTEGER DEFAULT 5,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_active DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Session analytics for platform metrics
CREATE TABLE IF NOT EXISTS session_analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE DEFAULT (DATE('now')),
    total_users INTEGER DEFAULT 0,
    active_conversations INTEGER DEFAULT 0,
    crisis_interventions INTEGER DEFAULT 0,
    average_emotion_score REAL DEFAULT 0.0,
    satisfaction_average REAL DEFAULT 0.0,
    counselor_interventions INTEGER DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Platform metrics for real-time display
CREATE TABLE IF NOT EXISTS platform_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    metric_name TEXT UNIQUE NOT NULL,
    metric_value REAL NOT NULL,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert initial platform metrics
INSERT OR REPLACE INTO platform_metrics (metric_name, metric_value) VALUES
('active_users_today', 3247),
('active_conversations', 847),
('crisis_interventions_today', 23),
('total_licensed_counselors', 1284),
('average_wellbeing_improvement', 4.2),
('user_satisfaction_rate', 97.3),
('counselor_rating', 4.8),
('monthly_total_users', 84392);

-- Insert sample counselors
INSERT OR REPLACE INTO counselors (counselor_uuid, name, license_number, license_state, specializations) VALUES
('couns-001', 'Dr. Sarah Martinez', 'LPC-12345', 'CA', '["anxiety", "depression", "trauma", "crisis_intervention"]'),
('couns-002', 'Dr. Michael Chen', 'LMFT-67890', 'NY', '["couples_therapy", "depression", "anxiety"]'),
('couns-003', 'Dr. Emily Rodriguez', 'LCSW-54321', 'TX', '["crisis_intervention", "PTSD", "substance_abuse"]'),
('couns-004', 'Dr. James Wilson', 'LPC-98765', 'FL', '["adolescent_therapy", "family_therapy", "anxiety"]'),
('couns-005', 'Dr. Lisa Thompson', 'LMHC-13579', 'WA', '["crisis_intervention", "depression", "grief_counseling"]');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_uuid ON users(user_uuid);
CREATE INDEX IF NOT EXISTS idx_conversations_session ON conversations(session_uuid);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_crisis_interventions_user ON crisis_interventions(user_id);
CREATE INDEX IF NOT EXISTS idx_counselors_status ON counselors(status);