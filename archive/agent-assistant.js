class AgentDashboard {
    constructor() {
        this.conversation = [];
        this.currentContext = null;
        this.isTyping = false;
        
        this.initializeEventListeners();
        this.initializeFAQs();
    }

    initializeEventListeners() {
        // Send button
        document.getElementById('send-btn').addEventListener('click', () => {
            this.sendAgentMessage();
        });

        // Enter key in textarea
        document.getElementById('agent-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendAgentMessage();
            }
        });

        // Typing indicator toggle
        document.getElementById('typing-btn').addEventListener('click', () => {
            this.toggleTypingIndicator();
        });

        // Suggestion clicks
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('suggestion')) {
                this.useSuggestion(e.target);
            }
        });

        // FAQ clicks
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('faq-item')) {
                this.insertFAQ(e.target.dataset.faq);
            }
        });
    }

    addUserMessage(text) {
        const messagesContainer = document.getElementById('messages');
        
        // Add user message to UI
        const messageElem = document.createElement('div');
        messageElem.classList.add('message', 'user-message');
        messageElem.textContent = text;
        messagesContainer.appendChild(messageElem);
        
        // Add to conversation history
        this.conversation.push({
            type: 'user',
            text: text,
            timestamp: new Date()
        });

        // Analyze message and provide AI suggestions
        this.analyzeUserMessage(text);
        
        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    sendAgentMessage() {
        const input = document.getElementById('agent-input');
        const text = input.value.trim();
        
        if (!text) return;

        const messagesContainer = document.getElementById('messages');
        
        // Remove typing indicator if present
        this.removeTypingIndicator();
        
        // Add agent message to UI
        const messageElem = document.createElement('div');
        messageElem.classList.add('message', 'agent-message');
        messageElem.textContent = text;
        messagesContainer.appendChild(messageElem);
        
        // Add to conversation history
        this.conversation.push({
            type: 'agent',
            text: text,
            timestamp: new Date()
        });

        // Clear input
        input.value = '';
        
        // Update suggestions based on what agent just sent
        this.updatePostResponseSuggestions();
        
        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    toggleTypingIndicator() {
        if (this.isTyping) {
            this.removeTypingIndicator();
        } else {
            this.showTypingIndicator();
        }
    }

    showTypingIndicator() {
        if (this.isTyping) return;
        
        const messagesContainer = document.getElementById('messages');
        const indicator = document.createElement('div');
        indicator.classList.add('typing-indicator');
        indicator.textContent = 'Agent is typing...';
        indicator.id = 'typing-indicator';
        messagesContainer.appendChild(indicator);
        
        this.isTyping = true;
        document.getElementById('typing-btn').textContent = 'Hide Typing';
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    removeTypingIndicator() {
        const indicator = document.getElementById('typing-indicator');
        if (indicator) {
            indicator.remove();
            this.isTyping = false;
            document.getElementById('typing-btn').textContent = 'Show Typing';
        }
    }

    analyzeUserMessage(text) {
        const analysis = this.getMessageAnalysis(text);
        
        // Update context display
        document.getElementById('context-display').innerHTML = 
            `Intent: <strong>${analysis.intent}</strong><br>` +
            `Risk Level: <strong>${analysis.riskLevel}</strong><br>` +
            `Emotional State: <strong>${analysis.emotion}</strong>`;

        // Show crisis alert if needed
        if (analysis.riskLevel === 'HIGH') {
            document.getElementById('crisis-alert').style.display = 'block';
        } else {
            document.getElementById('crisis-alert').style.display = 'none';
        }

        // Generate response suggestions
        this.generateResponseSuggestions(analysis, text);
        
        // Generate follow-up suggestions
        this.generateFollowupSuggestions(analysis);
    }

    getMessageAnalysis(text) {
        const t = text.toLowerCase();
        
        // Intent detection
        let intent = 'general';
        if (/anxi|panic|overwhelm|stress|worried/.test(t)) intent = 'anxiety';
        else if (/sleep|insomnia|tired|exhausted/.test(t)) intent = 'sleep';
        else if (/lonely|alone|isolat|nobody/.test(t)) intent = 'loneliness';
        else if (/depress|sad|down|hopeless/.test(t)) intent = 'depression';
        else if (/suicid|kill.*myself|end.*life|want.*die|harm.*myself/.test(t)) intent = 'self_harm';
        else if (/relationship|partner|friend|family/.test(t)) intent = 'relationships';
        else if (/work|job|career|boss/.test(t)) intent = 'work_stress';

        // Risk assessment
        let riskLevel = 'LOW';
        if (/suicid|kill.*myself|end.*life|want.*die|better.*dead/.test(t)) riskLevel = 'HIGH';
        else if (/harm.*myself|cut|hurt.*myself|can't.*go.*on/.test(t)) riskLevel = 'MEDIUM';
        else if (/overwhelm|panic|desperate|can't.*cope/.test(t)) riskLevel = 'MEDIUM';

        // Emotional state
        let emotion = 'neutral';
        if (/anxi|panic|nervous|worried/.test(t)) emotion = 'anxious';
        else if (/sad|depress|down|hopeless/.test(t)) emotion = 'depressed';
        else if (/angry|mad|furious|irritated/.test(t)) emotion = 'angry';
        else if (/confus|lost|don't know/.test(t)) emotion = 'confused';
        else if (/scare|afraid|terrif/.test(t)) emotion = 'fearful';

        return { intent, riskLevel, emotion };
    }

    generateResponseSuggestions(analysis, userText) {
        const container = document.getElementById('response-suggestions');
        container.innerHTML = '';

        let suggestions = [];

        // Crisis responses (highest priority)
        if (analysis.riskLevel === 'HIGH') {
            suggestions = [
                {
                    text: "I'm really concerned about what you've shared. Your safety is the most important thing right now. Are you in immediate danger?",
                    type: "crisis",
                    priority: "urgent"
                },
                {
                    text: "Thank you for trusting me with this. I want to help you stay safe. Can we talk about connecting you with someone right now who can help?",
                    type: "crisis",
                    priority: "urgent"
                },
                {
                    text: "I hear that you're in a lot of pain right now. You're important, and there are people who want to help. Can I share some crisis resources with you?",
                    type: "crisis",
                    priority: "urgent"
                }
            ];
        }
        // Medium risk responses
        else if (analysis.riskLevel === 'MEDIUM') {
            suggestions = [
                {
                    text: "It sounds like you're going through something really difficult right now. I'm here to listen and support you.",
                    type: "supportive",
                    priority: "high"
                },
                {
                    text: "I can hear how much pain you're in. Would it help to talk about what's been making things feel so overwhelming?",
                    type: "exploratory",
                    priority: "high"
                },
                {
                    text: "You've taken a brave step by reaching out. Let's work together to find some ways to help you feel safer and more supported.",
                    type: "encouraging",
                    priority: "high"
                }
            ];
        }
        // Intent-based responses for lower risk
        else {
            switch (analysis.intent) {
                case 'anxiety':
                    suggestions = [
                        {
                            text: "Anxiety can feel overwhelming. Can you tell me more about what's been triggering these feelings for you?",
                            type: "exploratory"
                        },
                        {
                            text: "I hear that you've been feeling anxious. That must be really challenging. What does the anxiety feel like for you?",
                            type: "validating"
                        },
                        {
                            text: "Thank you for sharing that with me. Anxiety affects everyone differently. Are there particular situations that make it worse?",
                            type: "exploratory"
                        }
                    ];
                    break;
                case 'sleep':
                    suggestions = [
                        {
                            text: "Sleep troubles can really affect how we feel during the day. How long has this been going on for you?",
                            type: "exploratory"
                        },
                        {
                            text: "I'm sorry you're having trouble sleeping. That can be so frustrating. What does a typical night look like for you?",
                            type: "empathetic"
                        }
                    ];
                    break;
                case 'loneliness':
                    suggestions = [
                        {
                            text: "Feeling lonely can be really painful. I'm glad you reached out today. Can you tell me more about what's been making you feel isolated?",
                            type: "validating"
                        },
                        {
                            text: "Thank you for sharing that with me. Loneliness is something many people struggle with. What would connection look like for you right now?",
                            type: "exploratory"
                        }
                    ];
                    break;
                default:
                    suggestions = [
                        {
                            text: "Thank you for sharing that with me. I can hear that this is important to you. Can you tell me more about what's been on your mind?",
                            type: "open-ended"
                        },
                        {
                            text: "I'm here to listen and support you. What would be most helpful for you to talk about right now?",
                            type: "supportive"
                        },
                        {
                            text: "It sounds like you have a lot going on. I'm glad you reached out. Where would you like to start?",
                            type: "encouraging"
                        }
                    ];
            }
        }

        // Render suggestions
        suggestions.forEach(suggestion => {
            const elem = document.createElement('div');
            elem.classList.add('suggestion');
            if (suggestion.priority === 'urgent') {
                elem.style.borderColor = 'var(--danger)';
                elem.style.backgroundColor = '#fef2f2';
            }
            
            elem.innerHTML = `
                <div class="suggestion-text">${suggestion.text}</div>
                <div class="suggestion-meta">
                    <span class="intent-badge">${suggestion.type}</span>
                    <span>Click to use</span>
                </div>
            `;
            
            container.appendChild(elem);
        });
    }

    generateFollowupSuggestions(analysis) {
        const container = document.getElementById('followup-suggestions');
        container.innerHTML = '';

        let followups = [];

        if (analysis.riskLevel === 'HIGH') {
            followups = [
                "Would you like me to provide crisis hotline numbers?",
                "Is there someone safe you can be with right now?",
                "Can we talk about creating a safety plan together?"
            ];
        } else {
            switch (analysis.intent) {
                case 'anxiety':
                    followups = [
                        "Would you like to try a grounding exercise together?",
                        "Have you tried any coping strategies that have helped before?",
                        "Would breathing exercises be helpful right now?"
                    ];
                    break;
                case 'sleep':
                    followups = [
                        "Would you like some tips for better sleep hygiene?",
                        "Have you talked to a doctor about your sleep issues?",
                        "What does your bedtime routine look like?"
                    ];
                    break;
                default:
                    followups = [
                        "How long have you been feeling this way?",
                        "What kind of support would be most helpful?",
                        "Are there things that usually help you feel better?"
                    ];
            }
        }

        followups.forEach(text => {
            const elem = document.createElement('div');
            elem.classList.add('suggestion');
            elem.innerHTML = `
                <div class="suggestion-text">${text}</div>
                <div class="suggestion-meta">
                    <span class="intent-badge">follow-up</span>
                    <span>Click to use</span>
                </div>
            `;
            container.appendChild(elem);
        });
    }

    updatePostResponseSuggestions() {
        // After agent sends a message, provide follow-up suggestions
        const container = document.getElementById('followup-suggestions');
        container.innerHTML = '';

        const followups = [
            "How does that resonate with you?",
            "What are your thoughts on that?",
            "Is there anything else you'd like to share about this?",
            "How are you feeling right now?",
            "What feels most important to focus on next?"
        ];

        followups.forEach(text => {
            const elem = document.createElement('div');
            elem.classList.add('suggestion');
            elem.innerHTML = `
                <div class="suggestion-text">${text}</div>
                <div class="suggestion-meta">
                    <span class="intent-badge">follow-up</span>
                    <span>Click to use</span>
                </div>
            `;
            container.appendChild(elem);
        });
    }

    useSuggestion(suggestionElement) {
        const text = suggestionElement.querySelector('.suggestion-text').textContent;
        document.getElementById('agent-input').value = text;
        document.getElementById('agent-input').focus();
    }

    initializeFAQs() {
        this.faqs = {
            crisis: "If you're having thoughts of suicide or self-harm, please reach out immediately:\n• National Suicide Prevention Lifeline: 988\n• Crisis Text Line: Text HOME to 741741\n• Emergency Services: 911\n\nYou matter, and help is available 24/7.",
            
            anxiety: "For anxiety, try these techniques:\n• 4-7-8 breathing: Inhale for 4, hold for 7, exhale for 8\n• 5-4-3-2-1 grounding: Name 5 things you see, 4 you can touch, 3 you hear, 2 you smell, 1 you taste\n• Progressive muscle relaxation\n• Mindfulness meditation",
            
            sleep: "Sleep hygiene tips:\n• Keep a consistent sleep schedule\n• Create a relaxing bedtime routine\n• Avoid screens 1 hour before bed\n• Keep your bedroom cool, dark, and quiet\n• Limit caffeine after 2 PM\n• Consider talking to a healthcare provider if problems persist",
            
            boundaries: "Setting healthy boundaries:\n• Be clear and direct about your limits\n• It's okay to say no without explanation\n• Start small and practice self-compassion\n• Remember that boundaries protect relationships\n• Seek support when boundary-setting feels difficult"
        };
    }

    insertFAQ(faqType) {
        const faqText = this.faqs[faqType];
        if (faqText) {
            document.getElementById('agent-input').value = faqText;
            document.getElementById('agent-input').focus();
        }
    }
}

// Make it globally available
window.AgentDashboard = AgentDashboard;