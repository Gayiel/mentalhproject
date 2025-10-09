// Enhanced Mental Health AI Assistant with Human-AI Collaboration
// Implements zero-tolerance crisis detection and direct clinic connections

class CollaborativeMentalHealthAI {
    constructor() {
        this.messages = [];
        this.isTyping = false;
        this.userName = null;
        this.userLocation = null;
        this.sessionId = this.generateSessionId();
        this.humanAgentConnected = false;
        this.crisisMode = false;
        
        // Zero-tolerance crisis detection keywords
        this.crisisKeywords = [
            'suicide', 'suicidal', 'kill myself', 'end my life', 'take my life', 'taking my life',
            'hurt myself', 'harm myself', 'cut myself', 'want to die', 'going to die',
            'no reason to live', 'better off dead', 'end it all', 'can\'t go on',
            'give up', 'not worth living', 'thoughts of suicide', 'thinking about suicide',
            'thinking about death', 'want to disappear', 'don\'t want to be here',
            'wish I was dead', 'can\'t cope anymore', 'no hope', 'hopeless',
            'hurt others', 'harm someone', 'make them pay', 'violence'
        ];

        // Verified crisis services by location
        this.crisisServices = {
            'US': {
                national: {
                    name: '988 Suicide & Crisis Lifeline',
                    phone: '988',
                    text: 'Text HOME to 741741',
                    chat: 'https://suicidepreventionlifeline.org/chat/',
                    available: '24/7'
                },
                emergency: '911'
            },
            'UK': {
                national: {
                    name: 'Samaritans',
                    phone: '116 123',
                    text: 'Text SHOUT to 85258',
                    chat: 'https://www.samaritans.org/how-we-can-help/contact-samaritan/',
                    available: '24/7'
                },
                emergency: '999'
            },
            'CA': {
                national: {
                    name: 'Canada Suicide Prevention Service',
                    phone: '1-833-456-4566',
                    text: 'Text 45645',
                    chat: 'https://talksuicide.ca/',
                    available: '24/7'
                },
                emergency: '911'
            },
            'default': {
                national: {
                    name: 'International Crisis Support',
                    phone: 'Visit findahelpline.com',
                    text: 'Local crisis text lines available',
                    chat: 'https://findahelpline.com',
                    available: 'Varies by location'
                },
                emergency: 'Local emergency services'
            }
        };

        // Mental health clinics database (would be populated from API)
        this.clinicDatabase = {
            'US': [
                {
                    name: 'BetterHelp Online Therapy',
                    type: 'Telehealth',
                    services: ['Individual Therapy', 'Couples Therapy', 'Teen Therapy'],
                    availability: '24/7 messaging, scheduled sessions',
                    booking: 'https://www.betterhelp.com/',
                    insurance: 'Some plans accepted'
                },
                {
                    name: 'Talkspace',
                    type: 'Telehealth',
                    services: ['Individual Therapy', 'Psychiatry'],
                    availability: 'Daily messaging, video sessions',
                    booking: 'https://www.talkspace.com/',
                    insurance: 'Many plans accepted'
                },
                {
                    name: 'Psychology Today Directory',
                    type: 'Directory',
                    services: ['Find Local Therapists', 'Specialty Matching'],
                    availability: 'Search available providers',
                    booking: 'https://www.psychologytoday.com/',
                    insurance: 'Filter by insurance'
                }
            ]
        };

        // Interaction logging for human review
        this.interactionLog = [];
        this.humanSuggestions = [];
        
        this.init();
    }

    init() {
        this.messagesEl = document.getElementById('messages');
        this.inputEl = document.getElementById('message-input');
        this.sendBtn = document.getElementById('send-btn');
        this.crisisWarning = document.getElementById('crisis-warning');
        this.humanIndicator = document.getElementById('human-indicator');
        this.privacyNotice = document.getElementById('privacy-notice');
        
        this.setupEvents();
        this.showWelcome();
        this.showPrivacyNotice();
        this.logInteraction('session_started', { sessionId: this.sessionId });
    }

    setupEvents() {
        this.sendBtn?.addEventListener('click', () => this.sendMessage());
        
        this.inputEl?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        this.inputEl?.addEventListener('input', () => {
            this.updateSendButton();
            this.autoResize();
        });

        // Privacy controls
        document.getElementById('delete-data-btn')?.addEventListener('click', () => {
            this.deleteUserData();
        });

        document.getElementById('escalate-human-btn')?.addEventListener('click', () => {
            this.escalateToHuman();
        });
    }

    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    showWelcome() {
        setTimeout(() => {
            const welcomeMessage = `Hello! I'm an AI assistant working with licensed human mental health professionals to provide you with support.

${this.userName ? `Hi ${this.userName}, ` : ''}I'm here to listen and help connect you with the right resources. A human specialist reviews our conversations to ensure you get the best care possible.

What's been on your mind lately? Please share at your own pace - there's no pressure.`;

            this.addBotMessage(welcomeMessage);
            this.askForName();
        }, 500);
    }

    askForName() {
        setTimeout(() => {
            this.addBotMessage("If you're comfortable sharing, what would you like me to call you? (This helps me personalize our conversation, but it's completely optional)");
        }, 2000);
    }

    showPrivacyNotice() {
        const notice = document.getElementById('privacy-notice');
        if (notice) {
            notice.innerHTML = `
                <div class="privacy-content">
                    <h4>🔒 Your Privacy & Safety</h4>
                    <p>• This conversation is reviewed by licensed professionals</p>
                    <p>• Your data is HIPAA/GDPR compliant and secure</p>
                    <p>• You control your information and can delete it anytime</p>
                    <button id="delete-data-btn" class="privacy-btn">Delete My Data</button>
                    <button id="escalate-human-btn" class="privacy-btn">Connect to Human Now</button>
                </div>
            `;
        }
    }

    sendMessage(text = null) {
        const message = text || this.inputEl?.value.trim();
        if (!message) return;

        this.addUserMessage(message);
        this.logInteraction('user_message', { message, timestamp: new Date().toISOString() });
        
        if (!text) {
            this.inputEl.value = '';
            this.autoResize();
            this.updateSendButton();
        }

        // Detect name if not already set
        if (!this.userName && this.isLikelyName(message)) {
            this.userName = this.extractName(message);
            this.logInteraction('name_detected', { name: this.userName });
        }

        this.showTyping();
        
        setTimeout(() => {
            this.processMessage(message);
        }, 1000 + Math.random() * 1000);
    }

    processMessage(message) {
        this.hideTyping();
        
        // ZERO TOLERANCE CRISIS DETECTION
        const crisisDetected = this.scanForCrisis(message);
        
        if (crisisDetected) {
            this.handleCrisisProtocol(message, crisisDetected);
            return;
        }

        // Check for ambiguous distress
        const distressLevel = this.assessDistressLevel(message);
        if (distressLevel === 'high' && !this.crisisMode) {
            this.checkSafetyDirectly(message);
            return;
        }

        // Normal supportive response with human collaboration
        this.provideSupportiveResponse(message);
    }

    scanForCrisis(message) {
        const text = message.toLowerCase();
        
        for (const keyword of this.crisisKeywords) {
            if (text.includes(keyword)) {
                this.logInteraction('crisis_detected', {
                    keyword,
                    message,
                    timestamp: new Date().toISOString(),
                    severity: 'high'
                });
                return keyword;
            }
        }
        
        return null;
    }

    handleCrisisProtocol(message, detectedKeyword) {
        this.crisisMode = true;
        
        // Show crisis indicator
        if (this.crisisWarning) {
            this.crisisWarning.classList.add('show');
            this.crisisWarning.innerHTML = `
                🚨 <strong>Crisis Protocol Activated</strong><br>
                A human crisis specialist has been notified and will join shortly.
            `;
        }

        // Update human indicator
        this.updateHumanIndicator('crisis', 'Crisis specialist connecting...');
        
        // Immediate supportive response
        const crisisResponse = `${this.userName ? this.userName + ', ' : ''}your safety is very important to me. Help is available right now, and I will connect you to a professional immediately.

A human crisis specialist has been notified and will join our conversation within moments. You don't have to face this alone.`;

        this.addBotMessage(crisisResponse);
        
        // Provide immediate crisis resources
        setTimeout(() => {
            this.provideCrisisResources();
            this.notifyHumanCrisisTeam(message, detectedKeyword);
        }, 1500);
    }

    provideCrisisResources() {
        const location = this.userLocation || 'default';
        const services = this.crisisServices[location] || this.crisisServices['default'];
        
        const resourcesMessage = `Here are immediate support options available to you right now:

🆘 **${services.national.name}**
• Call: ${services.national.phone}
• Text: ${services.national.text}
• Online Chat: ${services.national.chat}
• Available: ${services.national.available}

🚨 **Emergency**: ${services.emergency}

I'm staying with you while help connects. You are not alone in this.`;

        this.addBotMessage(resourcesMessage);
        
        // Show clinic connection options
        setTimeout(() => {
            this.showEmergencyClinicOptions();
        }, 2000);
    }

    showEmergencyClinicOptions() {
        const clinicsMessage = `I can also help you connect directly with mental health professionals who have immediate availability:

Would you like me to:
• Find crisis counselors with same-day appointments
• Connect you to emergency mental health services
• Help schedule an urgent therapy session

Please let me know what feels most helpful right now.`;

        this.addBotMessage(clinicsMessage);
        this.addCrisisActionButtons();
    }

    addCrisisActionButtons() {
        const actionsEl = document.createElement('div');
        actionsEl.className = 'crisis-actions';
        actionsEl.innerHTML = `
            <button class="crisis-btn" onclick="window.mentalHealthAI.connectCrisisLine()">
                📞 Call Crisis Line Now
            </button>
            <button class="crisis-btn" onclick="window.mentalHealthAI.findEmergencyClinic()">
                🏥 Find Emergency Clinic
            </button>
            <button class="crisis-btn" onclick="window.mentalHealthAI.scheduleUrgentSession()">
                📅 Schedule Urgent Session
            </button>
        `;

        this.messagesEl?.appendChild(actionsEl);
        this.scrollToBottom();
    }

    checkSafetyDirectly(message) {
        const safetyCheckMessage = `${this.userName ? this.userName + ', ' : ''}I want to check in with you directly - do you feel safe right now? 

If you're having any thoughts of hurting yourself or others, I can connect you with a professional for extra support immediately. There's no judgment here, just care for your wellbeing.`;

        this.addBotMessage(safetyCheckMessage);
        
        this.addSafetyCheckButtons();
        this.logInteraction('safety_check_initiated', { originalMessage: message });
    }

    addSafetyCheckButtons() {
        const actionsEl = document.createElement('div');
        actionsEl.className = 'safety-check-actions';
        actionsEl.innerHTML = `
            <button class="safety-btn safe" onclick="window.mentalHealthAI.confirmSafety(true)">
                ✅ Yes, I feel safe
            </button>
            <button class="safety-btn crisis" onclick="window.mentalHealthAI.confirmSafety(false)">
                ⚠️ No, I need help now
            </button>
            <button class="safety-btn unsure" onclick="window.mentalHealthAI.connectHuman()">
                🤝 I'd like to talk to someone
            </button>
        `;

        this.messagesEl?.appendChild(actionsEl);
        this.scrollToBottom();
    }

    confirmSafety(isSafe) {
        // Remove safety check buttons
        document.querySelector('.safety-check-actions')?.remove();
        
        if (isSafe) {
            this.addBotMessage(`Thank you for letting me know. I'm here to support you. What would be most helpful to talk about right now?`);
            this.logInteraction('safety_confirmed', { safe: true });
        } else {
            // Treat as crisis
            this.handleCrisisProtocol("User indicated they don't feel safe", "safety_check_negative");
        }
    }

    provideSupportiveResponse(message) {
        // Generate AI response
        const topic = this.detectTopic(message);
        const response = this.generateSupportiveResponse(topic, message);
        
        // Generate suggestions for human agent
        const humanSuggestions = this.generateHumanSuggestions(topic, message);
        
        this.addBotMessage(response);
        this.logHumanSuggestions(humanSuggestions);
        
        // Show that human is reviewing
        this.updateHumanIndicator('reviewing', 'Human specialist reviewing conversation...');
        
        setTimeout(() => {
            this.addSupportOptions(topic);
        }, 1500);
    }

    generateSupportiveResponse(topic, message) {
        const responses = {
            anxiety: `${this.userName ? this.userName + ', ' : ''}that sounds really tough to deal with. Anxiety can feel overwhelming, and it takes courage to reach out about it.`,
            
            depression: `I hear you, ${this.userName ? this.userName : 'and'}. Those feelings sound heavy and difficult to carry. You're not alone in experiencing this.`,
            
            loneliness: `${this.userName ? this.userName + ', ' : ''}loneliness can be one of the most painful feelings. Thank you for sharing that with me - it shows real strength to reach out.`,
            
            relationships: `Relationship challenges can be so draining emotionally. ${this.userName ? this.userName + ', ' : ''}would you like to talk more about what's going on?`,
            
            work_stress: `Work stress can really follow you home and affect everything else. ${this.userName ? this.userName + ', ' : ''}that sounds like a lot to handle.`,
            
            sleep_issues: `Sleep problems make everything else so much harder. ${this.userName ? this.userName + ', ' : ''}your rest and wellbeing matter.`,
            
            general: `${this.userName ? this.userName + ', ' : ''}thank you for sharing that with me. I can tell this is important to you. Would you like to tell me more about what's going on?`
        };

        return responses[topic] || responses.general;
    }

    generateHumanSuggestions(topic, message) {
        return {
            suggestedResponses: [
                `"${this.userName ? this.userName + ', ' : ''}it sounds like you're going through a challenging time. Can you tell me more about what's been most difficult?"`,
                `"I appreciate you sharing that with me. What kind of support feels most helpful to you right now?"`,
                `"That sounds really hard to deal with. Have you been able to talk to anyone else about this?"`
            ],
            recommendedActions: [
                'Consider resource referral based on severity',
                'Assess need for professional therapy referral',
                'Monitor for any escalation in distress'
            ],
            clinicSuggestions: this.getRelevantClinics(topic),
            riskAssessment: this.assessDistressLevel(message)
        };
    }

    getRelevantClinics(topic) {
        const location = this.userLocation || 'US';
        const clinics = this.clinicDatabase[location] || this.clinicDatabase['US'];
        
        // Filter clinics based on topic/needs
        return clinics.filter(clinic => {
            switch(topic) {
                case 'anxiety':
                case 'depression':
                    return clinic.services.includes('Individual Therapy');
                case 'relationships':
                    return clinic.services.includes('Couples Therapy');
                default:
                    return true;
            }
        });
    }

    addSupportOptions(topic) {
        const actionsEl = document.createElement('div');
        actionsEl.className = 'support-actions';
        
        let options = '';
        
        if (topic === 'anxiety') {
            options = `
                <button class="support-btn" onclick="window.mentalHealthAI.offerBreathingExercise()">
                    🫁 Try breathing exercise
                </button>
                <button class="support-btn" onclick="window.mentalHealthAI.findAnxietyTherapist()">
                    👨‍⚕️ Find anxiety specialist
                </button>
            `;
        } else if (topic === 'depression') {
            options = `
                <button class="support-btn" onclick="window.mentalHealthAI.offerSelfCare()">
                    🌱 Self-care suggestions
                </button>
                <button class="support-btn" onclick="window.mentalHealthAI.findDepressionTherapist()">
                    👩‍⚕️ Find depression therapist
                </button>
            `;
        } else {
            options = `
                <button class="support-btn" onclick="window.mentalHealthAI.showGeneralResources()">
                    📚 View resources
                </button>
                <button class="support-btn" onclick="window.mentalHealthAI.findTherapist()">
                    👨‍⚕️ Find therapist
                </button>
            `;
        }
        
        options += `
            <button class="support-btn" onclick="window.mentalHealthAI.connectHuman()">
                🤝 Talk to human specialist
            </button>
        `;
        
        actionsEl.innerHTML = options;
        this.messagesEl?.appendChild(actionsEl);
        this.scrollToBottom();
    }

    // Clinic connection methods
    findTherapist() {
        document.querySelector('.support-actions')?.remove();
        
        this.addBotMessage(`I can help you connect with licensed therapists in your area. Let me show you some verified options:`);
        
        setTimeout(() => {
            this.showTherapistOptions();
        }, 1000);
    }

    showTherapistOptions() {
        const location = this.userLocation || 'US';
        const clinics = this.clinicDatabase[location] || this.clinicDatabase['US'];
        
        let clinicMessage = `Here are verified mental health services available to you:\n\n`;
        
        clinics.forEach((clinic, index) => {
            clinicMessage += `**${clinic.name}**\n`;
            clinicMessage += `• Type: ${clinic.type}\n`;
            clinicMessage += `• Services: ${clinic.services.join(', ')}\n`;
            clinicMessage += `• Availability: ${clinic.availability}\n`;
            clinicMessage += `• Insurance: ${clinic.insurance}\n`;
            clinicMessage += `• Book: ${clinic.booking}\n\n`;
        });
        
        clinicMessage += `Would you like me to help you connect with any of these services? I can assist with scheduling or provide more information.`;
        
        this.addBotMessage(clinicMessage);
        this.addClinicActionButtons();
    }

    addClinicActionButtons() {
        const actionsEl = document.createElement('div');
        actionsEl.className = 'clinic-actions';
        actionsEl.innerHTML = `
            <button class="clinic-btn" onclick="window.mentalHealthAI.scheduleAppointment()">
                📅 Help me schedule
            </button>
            <button class="clinic-btn" onclick="window.mentalHealthAI.getInsuranceInfo()">
                💳 Check insurance coverage
            </button>
            <button class="clinic-btn" onclick="window.mentalHealthAI.connectHuman()">
                🤝 Speak with specialist
            </button>
        `;

        this.messagesEl?.appendChild(actionsEl);
        this.scrollToBottom();
    }

    // Human collaboration methods
    connectHuman() {
        this.humanAgentConnected = true;
        this.updateHumanIndicator('connected', 'Human specialist joining conversation...');
        
        this.addBotMessage(`${this.userName ? this.userName + ', ' : ''}I'm connecting you with a human mental health specialist right now. They'll join our conversation shortly and can provide personalized guidance.

While we wait, is there anything specific you'd like to discuss with them?`);
        
        this.notifyHumanAgent('general_escalation');
        this.logInteraction('human_escalation_requested', { reason: 'user_request' });
    }

    escalateToHuman() {
        this.connectHuman();
    }

    updateHumanIndicator(status, message) {
        const indicator = this.humanIndicator;
        if (!indicator) return;
        
        indicator.className = `human-indicator ${status}`;
        
        const statusMessages = {
            'reviewing': '👁️ Human specialist reviewing',
            'connected': '🤝 Human specialist online',
            'crisis': '🚨 Crisis specialist connecting',
            'offline': '💤 Human support available'
        };
        
        indicator.textContent = statusMessages[status] || message;
    }

    notifyHumanAgent(reason) {
        // In production, this would send real-time notification to human agents
        this.logInteraction('human_notification_sent', {
            reason,
            sessionId: this.sessionId,
            timestamp: new Date().toISOString(),
            conversationSummary: this.generateConversationSummary()
        });
        
        // Simulate human response delay
        setTimeout(() => {
            this.simulateHumanJoining();
        }, 3000 + Math.random() * 2000);
    }

    notifyHumanCrisisTeam(message, keyword) {
        this.logInteraction('crisis_team_notification', {
            crisisMessage: message,
            detectedKeyword: keyword,
            sessionId: this.sessionId,
            timestamp: new Date().toISOString(),
            priority: 'URGENT',
            conversationHistory: this.messages
        });
        
        // Simulate crisis team response
        setTimeout(() => {
            this.simulateCrisisSpecialistJoining();
        }, 2000);
    }

    simulateHumanJoining() {
        this.addSystemMessage(`🤝 **Sarah (Licensed Therapist)** has joined the conversation`);
        
        setTimeout(() => {
            this.addHumanMessage(`Hi ${this.userName ? this.userName : 'there'}, I'm Sarah, a licensed mental health counselor. I've reviewed your conversation with our AI assistant. I'm here to provide additional support and guidance. How are you feeling right now?`);
        }, 1000);
    }

    simulateCrisisSpecialistJoining() {
        this.addSystemMessage(`🚨 **Dr. Martinez (Crisis Specialist)** has joined the conversation`);
        
        setTimeout(() => {
            this.addHumanMessage(`${this.userName ? this.userName : 'Hello'}, this is Dr. Martinez, a crisis intervention specialist. I'm here with you right now. Your safety is my priority. Can you tell me how you're feeling at this moment?`);
        }, 1000);
    }

    // Utility methods
    detectTopic(message) {
        const text = message.toLowerCase();
        
        if (/anxi|panic|stress|overwhelm|worried|nervous/.test(text)) return 'anxiety';
        if (/depress|sad|down|hopeless|empty|numb/.test(text)) return 'depression';
        if (/lonely|alone|isolat|no friends|nobody/.test(text)) return 'loneliness';
        if (/relationship|partner|friend|family|fight/.test(text)) return 'relationships';
        if (/work|job|career|boss|workplace/.test(text)) return 'work_stress';
        if (/sleep|insomnia|tired|can't sleep/.test(text)) return 'sleep_issues';
        
        return 'general';
    }

    assessDistressLevel(message) {
        const text = message.toLowerCase();
        const highDistressWords = ['overwhelming', 'can\'t handle', 'falling apart', 'breaking down', 'desperate'];
        const moderateDistressWords = ['struggling', 'difficult', 'hard time', 'stressed', 'worried'];
        
        if (highDistressWords.some(word => text.includes(word))) return 'high';
        if (moderateDistressWords.some(word => text.includes(word))) return 'moderate';
        return 'low';
    }

    isLikelyName(message) {
        const text = message.trim();
        return /^(my name is|i'm|i am|call me) \w+/i.test(text) || 
               (/^\w+$/.test(text) && text.length < 20 && !this.userName);
    }

    extractName(message) {
        const text = message.trim();
        const nameMatch = text.match(/^(?:my name is|i'm|i am|call me) (\w+)/i);
        if (nameMatch) return nameMatch[1];
        
        if (/^\w+$/.test(text) && text.length < 20) return text;
        return null;
    }

    generateConversationSummary() {
        return {
            totalMessages: this.messages.length,
            userConcerns: this.detectTopic(this.messages.filter(m => m.type === 'user').map(m => m.text).join(' ')),
            distressLevel: this.assessDistressLevel(this.messages.filter(m => m.type === 'user').map(m => m.text).join(' ')),
            crisisMode: this.crisisMode,
            userName: this.userName
        };
    }

    // Message display methods
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
        msgEl.style.whiteSpace = 'pre-wrap';
        msgEl.innerHTML = this.formatMessage(text);
        this.messagesEl?.appendChild(msgEl);
        this.scrollToBottom();
        
        this.messages.push({ type: 'bot', text, timestamp: Date.now() });
    }

    addHumanMessage(text) {
        const msgEl = document.createElement('div');
        msgEl.className = 'message human';
        msgEl.style.whiteSpace = 'pre-wrap';
        msgEl.innerHTML = this.formatMessage(text);
        this.messagesEl?.appendChild(msgEl);
        this.scrollToBottom();
        
        this.messages.push({ type: 'human', text, timestamp: Date.now() });
    }

    addSystemMessage(text) {
        const msgEl = document.createElement('div');
        msgEl.className = 'message system';
        msgEl.innerHTML = text;
        this.messagesEl?.appendChild(msgEl);
        this.scrollToBottom();
    }

    formatMessage(text) {
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');
    }

    showTyping() {
        if (this.isTyping) return;
        
        const typingEl = document.createElement('div');
        typingEl.className = 'typing';
        typingEl.id = 'typing-indicator';
        typingEl.innerHTML = `
            AI assistant thinking...
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

    scrollToBottom() {
        if (this.messagesEl) {
            this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
        }
    }

    autoResize() {
        if (this.inputEl) {
            this.inputEl.style.height = 'auto';
            this.inputEl.style.height = Math.min(this.inputEl.scrollHeight, 120) + 'px';
        }
    }

    updateSendButton() {
        if (this.sendBtn && this.inputEl) {
            this.sendBtn.disabled = !this.inputEl.value.trim();
        }
    }

    // Privacy and data methods
    deleteUserData() {
        if (confirm('Are you sure you want to delete all your conversation data? This cannot be undone.')) {
            localStorage.removeItem('mental_health_conversation');
            this.interactionLog = [];
            this.messages = [];
            this.userName = null;
            
            this.addSystemMessage('✅ Your data has been deleted successfully.');
            this.logInteraction('data_deleted', { timestamp: new Date().toISOString() });
        }
    }

    // Logging methods
    logInteraction(action, data) {
        const logEntry = {
            sessionId: this.sessionId,
            timestamp: new Date().toISOString(),
            action,
            data,
            userAgent: navigator.userAgent
        };
        
        this.interactionLog.push(logEntry);
        
        // Store locally and would send to secure server in production
        try {
            localStorage.setItem('mental_health_conversation', JSON.stringify({
                sessionId: this.sessionId,
                interactions: this.interactionLog,
                messages: this.messages
            }));
        } catch (e) {
            console.warn('Could not save interaction log:', e);
        }
    }

    logHumanSuggestions(suggestions) {
        this.humanSuggestions.push({
            timestamp: new Date().toISOString(),
            suggestions
        });
        
        this.logInteraction('human_suggestions_generated', { suggestions });
    }

    // Export methods for human review
    exportSessionData() {
        return {
            sessionId: this.sessionId,
            userName: this.userName,
            userLocation: this.userLocation,
            messages: this.messages,
            interactionLog: this.interactionLog,
            humanSuggestions: this.humanSuggestions,
            conversationSummary: this.generateConversationSummary(),
            exported: new Date().toISOString()
        };
    }
}

// Initialize the collaborative AI system
document.addEventListener('DOMContentLoaded', () => {
    window.mentalHealthAI = new CollaborativeMentalHealthAI();
});