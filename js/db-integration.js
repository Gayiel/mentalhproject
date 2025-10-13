// MindFlow Sanctuary - Database Integration Script
// This script connects the frontend live metrics with the database

class SanctuaryDatabase {
  constructor() {
    this.baseUrl = window.location.origin;
  }

  async fetchLiveMetrics() {
    try {
      const response = await fetch(`${this.baseUrl}/api/sanctuary/metrics`);
      if (!response.ok) throw new Error('Failed to fetch metrics');
      return await response.json();
    } catch (error) {
      console.error('Error fetching live metrics:', error);
      return null;
    }
  }

  async createConversation(anonymous = true) {
    try {
      const response = await fetch(`${this.baseUrl}/api/sanctuary/conversation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anonymous })
      });
      if (!response.ok) throw new Error('Failed to create conversation');
      return await response.json();
    } catch (error) {
      console.error('Error creating conversation:', error);
      return null;
    }
  }

  async logMessage(conversationId, messageText, senderType = 'user', sentimentScore = null, crisisKeywords = null) {
    try {
      const response = await fetch(`${this.baseUrl}/api/sanctuary/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: conversationId,
          message_text: messageText,
          sender_type: senderType,
          sentiment_score: sentimentScore,
          crisis_keywords: crisisKeywords
        })
      });
      if (!response.ok) throw new Error('Failed to log message');
      return await response.json();
    } catch (error) {
      console.error('Error logging message:', error);
      return null;
    }
  }

  async recordCrisisIntervention(conversationId, crisisLevel, interventionType = 'automated_detection', userId = null) {
    try {
      const response = await fetch(`${this.baseUrl}/api/sanctuary/crisis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          conversation_id: conversationId,
          crisis_level: crisisLevel,
          intervention_type: interventionType
        })
      });
      if (!response.ok) throw new Error('Failed to record crisis intervention');
      return await response.json();
    } catch (error) {
      console.error('Error recording crisis intervention:', error);
      return null;
    }
  }

  async fetchCounselors() {
    try {
      const response = await fetch(`${this.baseUrl}/api/sanctuary/counselors`);
      if (!response.ok) throw new Error('Failed to fetch counselors');
      return await response.json();
    } catch (error) {
      console.error('Error fetching counselors:', error);
      return null;
    }
  }
}

// Initialize database connection
window.sanctuaryDB = new SanctuaryDatabase();

// Enhanced live metrics update function
async function updateLiveMetricsFromDB() {
  const metrics = await window.sanctuaryDB.fetchLiveMetrics();
  if (!metrics) return;

  // Update the live data with real database values
  if (window.sanctuary && window.sanctuary.liveData) {
    window.sanctuary.liveData.users.current = metrics.total_users;
    window.sanctuary.liveData.sessions.current = metrics.active_sessions;
    window.sanctuary.liveData.crisisInterventions.current = metrics.crisis_interventions;
    window.sanctuary.liveData.counselors.current = metrics.counselors_online;
  }

  // Update DOM elements directly if sanctuary isn't initialized yet
  const userCount = document.getElementById('user-count');
  const sessionCount = document.getElementById('session-count'); 
  const crisisCount = document.getElementById('crisis-count');
  const counselorCount = document.getElementById('counselor-count');

  if (userCount) userCount.textContent = metrics.total_users.toLocaleString();
  if (sessionCount) sessionCount.textContent = metrics.active_sessions.toLocaleString();
  if (crisisCount) crisisCount.textContent = metrics.crisis_interventions.toLocaleString();
  if (counselorCount) counselorCount.textContent = metrics.counselors_online.toLocaleString();
}

// Start conversation tracking when entering sanctuary
let currentConversationId = null;

// Enhanced enterSanctuary function with database integration
async function enterSanctuaryWithDB() {
  // Transition immediately for responsive UX
  try { enterSanctuary(); } catch(e) { console.warn('enter fallback', e); }

  // Create a new conversation session in the background with a short timeout
  try {
    const conversation = await Promise.race([
      window.sanctuaryDB.createConversation(true),
      new Promise(resolve => setTimeout(() => resolve(null), 1500))
    ]);
    if (conversation) {
      currentConversationId = conversation.conversation_id;
      // Started conversation session: ${conversation.session_id}
    }
  } catch (e) {
    console.warn('conversation creation failed (non-blocking):', e);
  }

  // Update metrics from database (non-blocking failure)
  try { await updateLiveMetricsFromDB(); } catch(e) { console.warn('metrics update failed', e); }
}

// Enhanced message logging
async function logMessageToDB(message, senderType = 'user') {
  if (!currentConversationId) return;

  let sentimentScore = null;
  let crisisKeywords = null;

  // Analyze message if it's from user
  if (senderType === 'user' && window.sanctuary) {
    const analysis = window.sanctuary.analyzeMessage(message);
    sentimentScore = analysis.score;
    if (analysis.crisis) {
      crisisKeywords = window.sanctuary.crisisKeywords.filter(keyword => 
        message.toLowerCase().includes(keyword)
      ).join(',');
    }
  }

  // Log to database
  const result = await window.sanctuaryDB.logMessage(
    currentConversationId, 
    message, 
    senderType, 
    sentimentScore, 
    crisisKeywords
  );

  // Record crisis intervention if flagged
  if (result && result.flagged_for_review && sentimentScore) {
    await window.sanctuaryDB.recordCrisisIntervention(
      currentConversationId,
      Math.min(100, sentimentScore),
      'automated_detection'
    );
  }

  return result;
}

// Initialize metrics on page load
document.addEventListener('DOMContentLoaded', function() {
  // Update metrics every 30 seconds
  updateLiveMetricsFromDB();
  setInterval(updateLiveMetricsFromDB, 30000);
});

// Export for global access
window.sanctuaryDBIntegration = {
  updateLiveMetricsFromDB,
  enterSanctuaryWithDB,
  logMessageToDB,
  getCurrentConversationId: () => currentConversationId
};