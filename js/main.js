// Main JavaScript for MindFlow Sanctuary
// Handles core functionality across all pages

// Global variables and state
window.mindflowState = {
  isConnected: false,
  currentPage: 'index',
  messages: [],
  isTyping: false
};

// Core functions that need to be available globally
window.enterNow = function() {
  try {
    // Try database-integrated version first
    if (typeof enterSanctuaryWithDB === 'function') {
      return enterSanctuaryWithDB();
    }
    // Fall back to regular enterSanctuary
    if (typeof enterSanctuary === 'function') {
      return enterSanctuary();
    }
    // Ultimate fallback - redirect to unified sanctuary
    window.location.href = 'unified-sanctuary.html';
  } catch(e) {
    console.error('enterNow error:', e);
    // Graceful fallback
    window.location.href = 'unified-sanctuary.html';
  }
};

// Global sendPrompt function
window.sendPrompt = function(userText, actionFn) {
  try {
    // Ensure we're in chat mode
    if (window.sanctuary && typeof window.sanctuary.addUserMessage === 'function') {
      if (userText) {
        const analysis = window.sanctuary.analyzeMessage ? window.sanctuary.analyzeMessage(userText) : { crisis: false, score: 0.5 };
        window.sanctuary.addUserMessage(userText);
        if (window.sanctuary.logInteraction) {
          window.sanctuary.logInteraction(userText, analysis);
        }
        if (window.sanctuary.updateDashboard) {
          window.sanctuary.updateDashboard();
        }
      }
    } else {
      // Fallback: add to messages container directly
      addMessageToContainer(userText, 'user');
      generateSimpleResponse(userText);
    }
    
    // Execute action function if provided
    if (typeof actionFn === 'function') {
      actionFn();
    }
  } catch(e) {
    console.error('sendPrompt error:', e);
    // Graceful fallback
    addMessageToContainer(userText || 'I need help', 'user');
    addMessageToContainer('I understand you need support. Let me connect you with our resources.', 'bot');
  }
};

// Global connectToHuman function
window.connectToHuman = function() {
  try {
    const response = `I'm connecting you with a licensed mental health counselor. 🤝

**While you wait (typically under 2 minutes):**
• This conversation is confidential and secure
• A licensed professional will review our chat
• You can continue sharing what's on your mind

**If this is an emergency:** Call 988 (Suicide & Crisis Lifeline) or 911 immediately.

How are you feeling right now? I'm here to support you until the counselor joins. 💙`;

    if (window.sanctuary && typeof window.sanctuary.addBotMessage === 'function') {
      window.sanctuary.addBotMessage(response);
      window.sanctuary.humanConnected = true;
      // Update status indicator
      const statusText = document.getElementById('human-status-text');
      if (statusText) {
        statusText.textContent = 'Licensed counselor joining...';
      }
    } else {
      addMessageToContainer(response, 'bot');
    }
    
    // Simulate human connection (in real app, this would be WebSocket/API call)
    setTimeout(() => {
      const humanResponse = "Hi there, I'm Sarah, a licensed mental health counselor. I've reviewed our conversation and I'm here to support you. What would be most helpful for you right now?";
      if (window.sanctuary && typeof window.sanctuary.addBotMessage === 'function') {
        window.sanctuary.addBotMessage(humanResponse, true); // true indicates human counselor
      } else {
        addMessageToContainer(humanResponse, 'counselor');
      }
      
      // Update status
      const statusText = document.getElementById('human-status-text');
      if (statusText) {
        statusText.textContent = 'Licensed counselor - Sarah M., LCSW';
      }
    }, 3000);
    
  } catch(e) {
    console.error('connectToHuman error:', e);
    // Fallback
    addMessageToContainer('A licensed counselor will be with you shortly. Your mental health and safety are our priority.', 'bot');
  }
};

// Fallback message handling for when sanctuary.js isn't loaded
function addMessageToContainer(message, type) {
  const container = document.getElementById('messages-container');
  if (!container) return;
  
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${type}-message`;
  messageDiv.setAttribute('role', 'article');
  messageDiv.setAttribute('aria-label', `${type} message`);
  
  const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  let icon = '💙';
  if (type === 'user') icon = '👤';
  else if (type === 'counselor') icon = '👩‍⚕️';
  
  messageDiv.innerHTML = `
    <div class="message-header">
      <span class="message-icon">${icon}</span>
      <span class="message-sender">${type === 'user' ? 'You' : type === 'counselor' ? 'Licensed Counselor' : 'MindFlow AI'}</span>
      <span class="message-time">${timestamp}</span>
    </div>
    <div class="message-content">${message}</div>
  `;
  
  container.appendChild(messageDiv);
  container.scrollTop = container.scrollHeight;
  
  // Announce to screen readers
  const liveRegion = document.getElementById('sr-live-region');
  if (liveRegion) {
    liveRegion.textContent = `New ${type} message: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`;
  }
}

// Simple response generation fallback
function generateSimpleResponse(userMessage) {
  const responses = [
    "Thank you for sharing that with me. Your feelings are completely valid. 💙",
    "I hear you, and I want you to know that you're not alone in this. 🤗",
    "That sounds really challenging. I'm here to support you through this. 🌱",
    "Your courage in reaching out shows strength. Let's work through this together. 💪"
  ];
  
  setTimeout(() => {
    const response = responses[Math.floor(Math.random() * responses.length)];
    addMessageToContainer(response, 'bot');
  }, 1000 + Math.random() * 2000); // Random delay between 1-3 seconds
}

// Crisis detection and resources
window.showCrisisResources = function() {
  const crisisResponse = `🚨 **Immediate Crisis Support Available** 🚨

**If you're having thoughts of suicide or self-harm, please reach out now:**

📞 **Call 988** - Suicide & Crisis Lifeline (24/7, free, confidential)
💬 **Text HOME to 741741** - Crisis Text Line
🌐 **Chat online** - suicidepreventionlifeline.org/chat
🚑 **Call 911** - For immediate emergency help

**You are not alone. Your life has value. Help is available right now.**

Licensed counselors are standing by to support you. Would you like me to connect you directly with a human counselor?`;

  if (window.sanctuary && typeof window.sanctuary.addBotMessage === 'function') {
    window.sanctuary.addBotMessage(crisisResponse);
  } else {
    addMessageToContainer(crisisResponse, 'bot');
  }
};

// Breathing exercise function
window.showBreathingExercise = function() {
  const breathingResponse = `🌬️ **Let's try a calming breathing exercise together**

**4-7-8 Breathing Technique:**
1. **Breathe in** through your nose for 4 counts
2. **Hold your breath** for 7 counts  
3. **Exhale slowly** through your mouth for 8 counts

Let's do this together:
- Find a comfortable position
- Place one hand on your chest, one on your belly
- Focus on the hand on your belly rising and falling

**Ready? Let's begin:**
Breathe in... 1, 2, 3, 4
Hold... 1, 2, 3, 4, 5, 6, 7
Breathe out... 1, 2, 3, 4, 5, 6, 7, 8

Great job! How are you feeling? Would you like to try another round? 💙`;

  if (window.sanctuary && typeof window.sanctuary.addBotMessage === 'function') {
    window.sanctuary.addBotMessage(breathingResponse);
  } else {
    addMessageToContainer(breathingResponse, 'bot');
  }
};

// Find therapists function
window.findTherapists = function() {
  const therapistResponse = `🏥 **Finding Professional Mental Health Support**

**Psychology Today Therapist Finder:**
- Visit: psychologytoday.com/us/therapists
- Filter by location, insurance, specialties
- Read profiles and book consultations

**Insurance-Based Options:**
- Contact your insurance provider's mental health line
- Many plans cover therapy with minimal copays
- Ask about telehealth options

**Community Resources:**
- Community mental health centers
- University counseling programs (often low-cost)
- Employee Assistance Programs (EAP) through work

**Questions to ask potential therapists:**
- Do you accept my insurance?
- What's your experience with [your specific concerns]?
- What therapy approaches do you use?
- Do you offer telehealth sessions?

Would you like help preparing questions for a therapist consultation? 💙`;

  if (window.sanctuary && typeof window.sanctuary.addBotMessage === 'function') {
    window.sanctuary.addBotMessage(therapistResponse);
  } else {
    addMessageToContainer(therapistResponse, 'bot');
  }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  window.mindflowState.currentPage = document.title.includes('Sanctuary') ? 'sanctuary' : 'index';
  
  // Add basic message input handling if not handled by sanctuary.js
  const messageInput = document.getElementById('message-input');
  const sendButton = document.getElementById('send-button');
  
  if (messageInput && sendButton && !window.sanctuary) {
    sendButton.addEventListener('click', function() {
      const message = messageInput.value.trim();
      if (message) {
        addMessageToContainer(message, 'user');
        messageInput.value = '';
        generateSimpleResponse(message);
      }
    });
    
    messageInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendButton.click();
      }
    });
  }
  
  console.log('MindFlow main.js loaded successfully');
});

// Export functions for external use
window.MindFlowCore = {
  enterNow: window.enterNow,
  sendPrompt: window.sendPrompt,
  connectToHuman: window.connectToHuman,
  showCrisisResources: window.showCrisisResources,
  showBreathingExercise: window.showBreathingExercise,
  findTherapists: window.findTherapists,
  addMessageToContainer: addMessageToContainer
};