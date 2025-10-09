// Clean, simple mental health chat - unified JavaScript
// Combines the best parts into one clean, maintainable file

class MindFlowApp {
    constructor() {
        this.messages = [];
        this.isTyping = false;
        this.currentTopic = null;
        
        // Simple topic detection keywords
        this.topics = {
            anxiety: /anxi|panic|stress|overwhelm|worried|nervous|scared/,
            sleep: /sleep|insomnia|tired|can't sleep|exhausted|restless/,
            lonely: /lonely|alone|isolat|no friends|nobody|empty/,
            sad: /sad|depress|down|hopeless|blue|low|hurt/,
            motivation: /motivat|focus|energy|lazy|procrastinat|stuck/,
            relationships: /relationship|partner|friend|family|fight|breakup/,
            work: /work|job|career|boss|coworker|workplace|office/,
            school: /school|college|university|grades|exam|homework|study/,
            anger: /angry|mad|frustrated|irritated|rage|furious/,
            gratitude: /thank|appreciate|grateful|better|helped|good/,
            greeting: /hi|hello|hey|good morning|good evening|how are you/
        };

        // Crisis detection words - important for safety
        this.crisisWords = [
            'kill myself', 'end my life', 'suicide', 'want to die',
            'hurt myself', 'harm myself', 'no reason to live',
            'better off dead', 'end it all', 'can\'t go on'
        ];

        // Natural, supportive responses
        this.responses = {
            anxiety: [
                "Anxiety can feel really overwhelming. It's your body trying to protect you, but sometimes it goes into overdrive.",
                "Those worried feelings are tough to deal with. You're not alone in experiencing this.",
                "Anxiety affects so many people. It's hard when your mind feels like it's racing."
            ],
            sleep: [
                "Sleep problems are so frustrating and make everything else feel harder.",
                "When we can't sleep, it affects our whole day. Your rest is important.",
                "Sleep troubles can be really draining. It's hard when your body needs rest but your mind won't quiet."
            ],
            lonely: [
                "Loneliness is one of the most painful feelings. It takes courage to reach out.",
                "Feeling disconnected from others is really hard. Connection is a basic human need.",
                "It's brave to share that you're feeling lonely. That feeling is more common than you might think."
            ],
            sad: [
                "It sounds like you're going through a really tough time right now.",
                "Sadness can feel so heavy. It's okay to feel this way - emotions are part of being human.",
                "I can hear that you're hurting. Those feelings are valid and it's okay to sit with them."
            ],
            motivation: [
                "Everyone struggles with motivation sometimes. It doesn't mean anything is wrong with you.",
                "Low energy and focus can be so frustrating. Sometimes our minds and bodies need different approaches.",
                "Motivation comes and goes for everyone. Be gentle with yourself during the low periods."
            ],
            relationships: [
                "Relationships can be complicated and emotionally exhausting sometimes.",
                "People connections are messy - and that includes all of us. It's part of being human.",
                "Relationship challenges can feel so draining. It affects our whole sense of well-being."
            ],
            work: [
                "Work stress can really follow you home and affect everything else.",
                "Job pressure is real and can feel overwhelming. It's important to acknowledge that.",
                "Work taking a toll on your well-being is more common than it should be."
            ],
            school: [
                "School pressure can feel intense and affect your whole life, not just grades.",
                "Academic stress is real and can be overwhelming. It's more than just homework.",
                "Educational pressure can feel like it consumes everything. That's a lot to carry."
            ],
            anger: [
                "Anger is a normal emotion, even when it feels intense and uncomfortable.",
                "Usually anger is telling us something important is being threatened or hurt.",
                "Those frustrated feelings can be really overwhelming. Anger often has something important underneath."
            ],
            gratitude: [
                "I'm really glad this has been helpful. It means a lot to know you're feeling a bit better.",
                "Thank you for sharing that with me. It's wonderful to hear you're finding some relief.",
                "I'm so happy this conversation has been supportive for you."
            ],
            greeting: [
                "Hi there! I'm here to listen and support you. What's been on your mind lately?",
                "Hello! It's good to meet you. Feel free to share whatever is important to you right now.",
                "Hey! I'm glad you're here. What would you like to talk about today?"
            ],
            general: [
                "Thank you for sharing that with me. I can tell this is important to you.",
                "I hear you. Would you like to tell me more about what's going on?",
                "That sounds like something that's really on your mind. I'm here to listen."
            ]
        };

        // Helpful techniques and suggestions
        this.suggestions = {
            anxiety: [
                {
                    label: 'Try breathing exercise',
                    response: `Here's a simple breathing technique that can help:

1. Breathe in slowly through your nose for 4 counts
2. Hold for 4 counts  
3. Breathe out slowly through your mouth for 6 counts
4. Repeat 3-5 times

This activates your body's natural calm response.`
                },
                {
                    label: 'Grounding technique',
                    response: `Try this grounding exercise to feel more present:

• Look around and name 5 things you can see
• Name 4 things you can touch
• Name 3 things you can hear  
• Name 2 things you can smell
• Name 1 thing you can taste

This helps bring your mind back to the present moment.`
                }
            ],
            sleep: [
                {
                    label: 'Sleep tips',
                    response: `Here are some gentle sleep suggestions:

• Try the same bedtime and wake time each day
• Avoid screens 1 hour before bed
• Keep your room cool, dark, and quiet
• Try reading or gentle stretching before bed
• Limit caffeine after 2 PM

Start with just one that feels manageable.`
                }
            ],
            lonely: [
                {
                    label: 'Connection ideas',
                    response: `Some ways to create connection:

• Reach out to someone you haven't talked to in a while
• Join a local group, class, or volunteer opportunity  
• Spend time in public spaces like cafes or libraries
• Try online communities for your interests
• Even small interactions can help (like chatting with a cashier)

What feels most comfortable for you to try?`
                }
            ],
            sad: [
                {
                    label: 'Gentle self-care',
                    response: `When feeling down, small acts of kindness to yourself help:

• Take a warm shower or bath
• Go outside for a few minutes, even just to sit
• Listen to music that comforts you
• Do something creative with your hands
• Reach out to someone who cares about you

You don't have to do everything - even one small thing counts.`
                }
            ],
            motivation: [
                {
                    label: 'Small steps approach',
                    response: `When motivation is low, try the "tiny step" method:

• Pick one very small task (2-5 minutes max)
• Set a timer and just do that one thing
• Celebrate that you did it
• If you feel like doing more, great! If not, that's okay too

Sometimes starting is the hardest part.`
                }
            ]
        };

        this.init();
    }

    init() {
        // Get DOM elements
        this.messagesEl = document.getElementById('messages');
        this.inputEl = document.getElementById('message-input');
        this.sendBtn = document.getElementById('send-btn');
        this.quickOptions = document.getElementById('quick-options');
        this.crisisWarning = document.getElementById('crisis-warning');
        
        this.setupEvents();
        this.setupInputResize();
        this.showWelcome();
    }

    setupEvents() {
        // Send button click
        this.sendBtn?.addEventListener('click', () => this.sendMessage());
        
        // Enter key to send
        this.inputEl?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Update send button state
        this.inputEl?.addEventListener('input', () => {
            this.updateSendButton();
        });

        // Quick option buttons
        this.quickOptions?.addEventListener('click', (e) => {
            if (e.target.matches('.quick-btn')) {
                const message = e.target.dataset.message;
                this.sendMessage(message);
                this.quickOptions.style.display = 'none';
            }
        });
    }

    setupInputResize() {
        this.inputEl?.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 120) + 'px';
        });
    }

    updateSendButton() {
        if (this.sendBtn) {
            this.sendBtn.disabled = !this.inputEl.value.trim();
        }
    }

    showWelcome() {
        setTimeout(() => {
            this.addBotMessage("Hi! I'm here to listen and support you. What's been on your mind lately?");
        }, 500);
    }

    sendMessage(text = null) {
        const message = text || this.inputEl?.value.trim();
        if (!message) return;

        this.addUserMessage(message);
        
        if (!text) {
            this.inputEl.value = '';
            this.inputEl.style.height = 'auto';
            this.updateSendButton();
        }

        this.showTyping();
        
        // Process message after a realistic delay
        setTimeout(() => {
            this.processMessage(message);
        }, 800 + Math.random() * 800);
    }

    addUserMessage(text) {
        const msgEl = document.createElement('div');
        msgEl.className = 'message user';
        msgEl.textContent = text;
        this.messagesEl?.appendChild(msgEl);
        this.scrollToBottom();
        
        this.messages.push({ type: 'user', text, timestamp: Date.now() });
    }

    addBotMessage(text) {
        const msgEl = document.createElement('div');
        msgEl.className = 'message bot';
        msgEl.textContent = text;
        this.messagesEl?.appendChild(msgEl);
        this.scrollToBottom();
        
        this.messages.push({ type: 'bot', text, timestamp: Date.now() });
    }

    showTyping() {
        if (this.isTyping) return;
        
        const typingEl = document.createElement('div');
        typingEl.className = 'typing';
        typingEl.id = 'typing-indicator';
        typingEl.innerHTML = `
            Thinking...
            <div class="typing-dots">
                <span></span>
                <span></span>
                <span></span>
            </div>
        `;
        
        this.messagesEl?.appendChild(typingEl);
        this.isTyping = true;
        this.scrollToBottom();
    }

    hideTyping() {
        const typingEl = document.getElementById('typing-indicator');
        if (typingEl) {
            typingEl.remove();
            this.isTyping = false;
        }
    }

    processMessage(message) {
        this.hideTyping();
        
        // Check for crisis first - safety is priority
        if (this.isCrisis(message)) {
            this.handleCrisis();
            return;
        }

        // Detect topic and respond
        const topic = this.detectTopic(message);
        this.currentTopic = topic;
        const response = this.getResponse(topic);
        
        this.addBotMessage(response);
        
        // Add helpful suggestions after a moment
        setTimeout(() => {
            this.addSuggestions(topic);
        }, 1000);
    }

    isCrisis(message) {
        const text = message.toLowerCase();
        return this.crisisWords.some(word => text.includes(word));
    }

    handleCrisis() {
        // Show crisis warning
        if (this.crisisWarning) {
            this.crisisWarning.classList.add('show');
        }
        
        this.addBotMessage("I'm really worried about what you've shared. Your life matters and there are people who want to help you right now.");
        
        setTimeout(() => {
            this.addBotMessage(`Please reach out to one of these resources immediately:

• Call or text 988 (Suicide & Crisis Lifeline)
• Text HOME to 741741 (Crisis Text Line)  
• Call 911 or go to your nearest emergency room

You don't have to face this alone.`);
        }, 1500);
    }

    detectTopic(message) {
        const text = message.toLowerCase();
        
        // Check each topic pattern
        for (const [topic, pattern] of Object.entries(this.topics)) {
            if (pattern.test(text)) {
                return topic;
            }
        }
        
        return 'general';
    }

    getResponse(topic) {
        const responses = this.responses[topic] || this.responses.general;
        // Pick random response for variety
        return responses[Math.floor(Math.random() * responses.length)];
    }

    addSuggestions(topic) {
        const suggestions = this.suggestions[topic];
        if (!suggestions || !suggestions.length) return;

        const actionsEl = document.createElement('div');
        actionsEl.className = 'actions';

        suggestions.forEach(suggestion => {
            const btn = document.createElement('button');
            btn.className = 'action-btn';
            btn.textContent = suggestion.label;
            btn.addEventListener('click', () => {
                this.addBotMessage(suggestion.response);
                actionsEl.remove();
            });
            actionsEl.appendChild(btn);
        });

        this.messagesEl?.appendChild(actionsEl);
        this.scrollToBottom();
    }

    scrollToBottom() {
        if (this.messagesEl) {
            this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
        }
    }

    // Utility method to save conversation (if needed later)
    saveConversation() {
        try {
            localStorage.setItem('mindflow_conversation', JSON.stringify(this.messages));
        } catch (e) {
            console.warn('Could not save conversation:', e);
        }
    }

    // Utility method to load previous conversation (if needed later)
    loadConversation() {
        try {
            const saved = localStorage.getItem('mindflow_conversation');
            if (saved) {
                this.messages = JSON.parse(saved);
                // Could rebuild UI here if needed
            }
        } catch (e) {
            console.warn('Could not load conversation:', e);
        }
    }
}

// Initialize app when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.mindFlowApp = new MindFlowApp();
});

// Export for potential use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MindFlowApp;
}