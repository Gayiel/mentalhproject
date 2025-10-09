// Mental Health Chatbot - Strict Protocol Implementation
// Follows precise guidelines for safety, crisis detection, and professional resource connection

class MentalHealthChatbot {
    constructor() {
        this.messages = [];
        this.isTyping = false;
        this.userProfile = {
            location: null,
            language: 'en',
            crisisStatus: false
        };
        
        // Strict crisis detection keywords - no interpretation allowed
        this.exactCrisisKeywords = [
            'i want to harm myself',
            'i want to hurt myself', 
            'i feel unsafe',
            'i am scared for my safety',
            'no hope',
            'can\'t cope',
            'need help now',
            'i want to die',
            'kill myself',
            'end my life',
            'take my life',
            'taking my life',
            'hurt myself',
            'harm myself',
            'cut myself',
            'no reason to live',
            'better off dead',
            'end it all',
            'can\'t go on',
            'give up',
            'not worth living',
            'suicide',
            'suicidal',
            'thoughts of suicide',
            'thinking about suicide',
            'thinking about death',
            'want to disappear',
            'don\'t want to be here',
            'wish I was dead',
            'thinking about taking my life',
            'been thinking about taking my life'
        ];

        // Verified crisis services by location
        this.verifiedCrisisServices = {
            'US': {
                name: 'National Suicide Prevention Lifeline',
                phone: '988',
                text: 'Text HOME to 741741 (Crisis Text Line)',
                emergency: '911'
            },
            'UK': {
                name: 'Samaritans',
                phone: '116 123',
                text: 'Text SHOUT to 85258',
                emergency: '999'
            },
            'CA': {
                name: 'Canada Suicide Prevention Service',
                phone: '1-833-456-4566',
                text: 'Text 45645',
                emergency: '911'
            },
            'AU': {
                name: 'Lifeline Australia',
                phone: '13 11 14',
                text: 'Text 0477 13 11 14',
                emergency: '000'
            },
            'default': {
                name: 'International Association for Suicide Prevention',
                phone: 'Visit iasp.info/resources/Crisis_Centres/',
                text: 'Contact local emergency services',
                emergency: 'Local emergency number'
            }
        };

        // Verified mental health resources (non-crisis)
        this.verifiedResources = {
            'therapy': [
                'Psychology Today (psychologytoday.com)',
                'BetterHelp (betterhelp.com)',
                'Talkspace (talkspace.com)'
            ],
            'support_groups': [
                'NAMI Support Groups (nami.org)',
                'Mental Health America (mhanational.org)',
                'Depression and Bipolar Support Alliance (dbsalliance.org)'
            ],
            'self_help': [
                'NIMH Resources (nimh.nih.gov)',
                'MindTools (mindtools.com)',
                'Centre for Clinical Interventions (cci.health.wa.gov.au)'
            ]
        };

        // Interaction log for human review
        this.interactionLog = [];

        this.init();
    }

    init() {
        this.messagesEl = document.getElementById('messages');
        this.inputEl = document.getElementById('message-input');
        this.sendBtn = document.getElementById('send-btn');
        this.quickOptions = document.getElementById('quick-options');
        this.crisisWarning = document.getElementById('crisis-warning');
        
        this.setupEvents();
        this.setupInputResize();
        this.showGreeting();
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
        });

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

    showGreeting() {
        setTimeout(() => {
            const greeting = "Hello! I'm here to provide support and connect you with professional mental health resources. How are you feeling today?";
            this.addBotMessage(greeting);
            this.logInteraction('greeting_sent', { message: greeting });
        }, 500);
    }

    sendMessage(text = null) {
        const message = text || this.inputEl?.value.trim();
        if (!message) return;

        this.addUserMessage(message);
        this.logInteraction('user_message', { message: message });
        
        if (!text) {
            this.inputEl.value = '';
            this.inputEl.style.height = 'auto';
            this.updateSendButton();
        }

        this.showTyping();
        
        // Process with strict protocol
        setTimeout(() => {
            this.processMessageStrict(message);
        }, 1000);
    }

    processMessageStrict(message) {
        this.hideTyping();
        
        // STEP 1: Mandatory crisis detection scan
        const crisisDetected = this.scanForCrisisIndicators(message);
        
        if (crisisDetected) {
            this.handleCrisisProtocol(message, crisisDetected);
            return;
        }

        // STEP 2: Location detection if not already set
        if (!this.userProfile.location) {
            const detectedLocation = this.detectLocation(message);
            if (detectedLocation) {
                this.userProfile.location = detectedLocation;
            }
        }

        // STEP 3: Provide appropriate response
        this.provideStructuredResponse(message);
    }

    scanForCrisisIndicators(message) {
        const text = message.toLowerCase().trim();
        
        // Exact keyword matching only - no interpretation
        for (const keyword of this.exactCrisisKeywords) {
            if (text.includes(keyword)) {
                this.logInteraction('crisis_detected', { 
                    keyword: keyword, 
                    message: message,
                    timestamp: new Date().toISOString()
                });
                return keyword;
            }
        }
        
        return null;
    }

    handleCrisisProtocol(message, detectedKeyword) {
        // Activate crisis mode
        this.userProfile.crisisStatus = true;
        
        // Show crisis warning
        if (this.crisisWarning) {
            this.crisisWarning.classList.add('show');
        }
        
        // Exact crisis response - no interpretation
        const crisisMessage = "I noticed your message may indicate an urgent need. Reaching out to a professional can help bring support and safety.";
        this.addBotMessage(crisisMessage);
        
        // Get location-appropriate services
        const location = this.userProfile.location || 'default';
        const services = this.verifiedCrisisServices[location] || this.verifiedCrisisServices['default'];
        
        setTimeout(() => {
            const servicesMessage = `Here are trusted services you can contact:

• ${services.name}: ${services.phone}
• ${services.text}
• Emergency: ${services.emergency}

These are professional services available 24/7.`;
            
            this.addBotMessage(servicesMessage);
            
            this.logInteraction('crisis_response_sent', {
                original_message: message,
                detected_keyword: detectedKeyword,
                services_provided: services,
                timestamp: new Date().toISOString()
            });
        }, 1500);
    }

    detectLocation(message) {
        const text = message.toLowerCase();
        
        // Simple location detection - no assumptions
        if (text.includes('united states') || text.includes('usa') || text.includes('america')) return 'US';
        if (text.includes('united kingdom') || text.includes('uk') || text.includes('britain')) return 'UK';
        if (text.includes('canada')) return 'CA';
        if (text.includes('australia')) return 'AU';
        
        return null;
    }

    provideStructuredResponse(message) {
        const text = message.toLowerCase();
        
        // Detect support type needed
        let responseType = 'general';
        let resourceType = null;
        
        if (text.includes('therapist') || text.includes('therapy') || text.includes('counselor')) {
            responseType = 'therapy_request';
            resourceType = 'therapy';
        } else if (text.includes('support group') || text.includes('group therapy')) {
            responseType = 'support_group_request';
            resourceType = 'support_groups';
        } else if (text.includes('self help') || text.includes('resources') || text.includes('tools')) {
            responseType = 'self_help_request';
            resourceType = 'self_help';
        } else if (text.includes('anxious') || text.includes('anxiety')) {
            responseType = 'anxiety_support';
        } else if (text.includes('depressed') || text.includes('depression')) {
            responseType = 'depression_support';
        } else if (text.includes('lonely') || text.includes('alone')) {
            responseType = 'loneliness_support';
        }

        // Provide structured response
        const response = this.getStructuredResponse(responseType, resourceType);
        this.addBotMessage(response.message);
        
        if (response.resources) {
            setTimeout(() => {
                this.addBotMessage(response.resources);
            }, 1000);
        }

        this.logInteraction('structured_response', {
            user_message: message,
            response_type: responseType,
            resource_type: resourceType,
            response_sent: response
        });
    }

    getStructuredResponse(type, resourceType) {
        const responses = {
            'therapy_request': {
                message: "I can help you find professional therapy services. These are verified platforms where you can connect with licensed therapists.",
                resources: this.formatResources(this.verifiedResources.therapy)
            },
            'support_group_request': {
                message: "Support groups can provide valuable peer connection. Here are trusted organizations that offer support group services.",
                resources: this.formatResources(this.verifiedResources.support_groups)
            },
            'self_help_request': {
                message: "Self-help resources can be a good starting point. These are evidence-based resources from trusted mental health organizations.",
                resources: this.formatResources(this.verifiedResources.self_help)
            },
            'anxiety_support': {
                message: "Anxiety is treatable with professional support. Would you like me to provide information about therapy services or self-help resources?",
                resources: null
            },
            'depression_support': {
                message: "Depression is a medical condition that responds well to professional treatment. I can connect you with therapy services or support resources.",
                resources: null
            },
            'loneliness_support': {
                message: "Feeling lonely is difficult. Professional counselors and support groups can help with connection and coping strategies.",
                resources: null
            },
            'general': {
                message: "I'm here to help connect you with appropriate mental health resources. Could you tell me what specific type of support you're looking for?",
                resources: null
            }
        };

        return responses[type] || responses['general'];
    }

    formatResources(resourceList) {
        return "Here are verified resources:\n\n" + 
               resourceList.map(resource => `• ${resource}`).join('\n') + 
               "\n\nThese are trusted, professional services.";
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
        msgEl.style.whiteSpace = 'pre-wrap';
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
            Processing...
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

    logInteraction(action, data) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            action: action,
            data: data,
            userProfile: { ...this.userProfile }
        };
        
        this.interactionLog.push(logEntry);
        
        // Store in localStorage for human review
        try {
            localStorage.setItem('chatbot_interaction_log', JSON.stringify(this.interactionLog));
        } catch (e) {
            console.warn('Could not save interaction log:', e);
        }
    }

    // Method to export logs for human review
    exportLogs() {
        return {
            interactions: this.interactionLog,
            messages: this.messages,
            userProfile: this.userProfile,
            exported: new Date().toISOString()
        };
    }

    // Method to clear crisis status (for human moderator use)
    clearCrisisStatus() {
        this.userProfile.crisisStatus = false;
        if (this.crisisWarning) {
            this.crisisWarning.classList.remove('show');
        }
        this.logInteraction('crisis_status_cleared', { cleared_by: 'system' });
    }
}

// Initialize the strict protocol chatbot
document.addEventListener('DOMContentLoaded', () => {
    window.mentalHealthChatbot = new MentalHealthChatbot();
});

// Export for potential use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MentalHealthChatbot;
}