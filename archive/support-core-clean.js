// Simple, clean mental health support chat system
// No jargon, clear responses, focused on being helpful

class MentalHealthSupport {
    constructor() {
        this.responses = this.initializeResponses();
        this.crisisWords = [
            'kill myself', 'end my life', 'suicide', 'want to die',
            'hurt myself', 'harm myself', 'no reason to live',
            'better off dead', 'end it all', 'can\'t go on'
        ];
    }

    // Detect what the person is talking about
    detectTopic(message) {
        const text = message.toLowerCase();
        
        // Check for specific topics
        if (/anxi|panic|stress|overwhelm|worried|nervous/.test(text)) return 'anxiety';
        if (/sleep|insomnia|tired|can't sleep|exhausted/.test(text)) return 'sleep';
        if (/lonely|alone|isolat|no friends|nobody/.test(text)) return 'lonely';
        if (/sad|depress|down|hopeless|empty|numb/.test(text)) return 'sad';
        if (/motivat|focus|energy|lazy|procrastinat/.test(text)) return 'motivation';
        if (/relationship|partner|friend|family|fight|argument/.test(text)) return 'relationships';
        if (/work|job|career|boss|coworker|workplace/.test(text)) return 'work';
        if (/school|college|university|grades|exam|homework/.test(text)) return 'school';
        if (/angry|mad|frustrated|irritated|rage/.test(text)) return 'anger';
        if (/thank|appreciate|grateful|better|helped/.test(text)) return 'gratitude';
        if (/hi|hello|hey|good morning|good evening/.test(text)) return 'greeting';
        
        return 'general';
    }

    // Check if message indicates crisis
    isCrisis(message) {
        const text = message.toLowerCase();
        return this.crisisWords.some(word => text.includes(word));
    }

    // Get response based on topic
    getResponse(topic, message) {
        const topicResponses = this.responses[topic] || this.responses.general;
        
        // Pick a random response to feel more natural
        const randomResponse = topicResponses[Math.floor(Math.random() * topicResponses.length)];
        return randomResponse;
    }

    // Get follow-up actions/suggestions
    getSuggestions(topic) {
        const suggestions = {
            anxiety: [
                { 
                    label: 'Try breathing exercise', 
                    response: 'Let\'s do a simple breathing exercise:\n\n1. Breathe in slowly for 4 counts\n2. Hold for 4 counts\n3. Breathe out slowly for 6 counts\n4. Repeat 3-5 times\n\nThis can help calm your nervous system.' 
                },
                { 
                    label: 'Grounding technique', 
                    response: 'Here\'s a grounding exercise to help you feel more present:\n\n• Name 5 things you can see\n• Name 4 things you can touch\n• Name 3 things you can hear\n• Name 2 things you can smell\n• Name 1 thing you can taste\n\nThis helps bring you back to the present moment.' 
                }
            ],
            sleep: [
                {
                    label: 'Sleep tips',
                    response: 'Here are some things that might help with sleep:\n\n• Go to bed at the same time each night\n• Avoid screens 1 hour before bed\n• Keep your bedroom cool and dark\n• Try reading or gentle stretching before bed\n• Limit caffeine after 2 PM\n\nWhich of these feels most doable for you?'
                }
            ],
            sad: [
                {
                    label: 'Self-care ideas',
                    response: 'When feeling down, small acts of self-care can help:\n\n• Take a warm shower or bath\n• Go for a short walk outside\n• Listen to music you enjoy\n• Call someone who cares about you\n• Do something creative\n\nYou don\'t have to do everything - even one small thing can help.'
                }
            ],
            lonely: [
                {
                    label: 'Connection ideas',
                    response: 'Feeling lonely is hard. Here are some ways to connect:\n\n• Text or call someone you haven\'t talked to in a while\n• Join a local group or class\n• Volunteer for a cause you care about\n• Try online communities for your interests\n• Visit a public place like a coffee shop or library\n\nWhat feels most comfortable for you?'
                }
            ],
            motivation: [
                {
                    label: 'Small steps approach',
                    response: 'When motivation is low, try the "small steps" approach:\n\n• Pick just one tiny task (2-5 minutes)\n• Set a timer and do it\n• Celebrate that you did it\n• If you feel like doing more, great! If not, that\'s okay too\n\nSometimes starting is the hardest part.'
                }
            ]
        };

        return suggestions[topic] || [];
    }

    // Crisis response
    getCrisisResponse() {
        return {
            message: "I'm really concerned about what you've shared. Your life has value and there are people who want to help.",
            resources: [
                "• National Suicide Prevention Lifeline: 988 (call or text)",
                "• Crisis Text Line: Text HOME to 741741", 
                "• Emergency Services: 911",
                "• Or go to your nearest emergency room"
            ],
            followUp: "Please reach out to one of these resources right now. You don't have to go through this alone."
        };
    }

    initializeResponses() {
        return {
            greeting: [
                "Hello! I'm here to listen and support you. What's on your mind today?",
                "Hi there! I'm glad you're here. How are you feeling right now?",
                "Hey! Thanks for reaching out. What would you like to talk about?"
            ],
            anxiety: [
                "I hear that you're feeling anxious. That can be really overwhelming and exhausting.",
                "Anxiety can feel scary and intense. You're not alone in feeling this way.",
                "Thank you for sharing that with me. Anxiety affects many people and it's completely valid."
            ],
            sleep: [
                "Sleep problems can be really frustrating and affect how you feel during the day.",
                "Not getting good sleep is tough. It can make everything else feel harder.",
                "Sleep issues are more common than you might think. What's been happening with your sleep?"
            ],
            lonely: [
                "Feeling lonely can be really painful. I'm glad you reached out today.",
                "Loneliness hurts. It takes courage to share that feeling.",
                "You're not alone in feeling lonely. Many people struggle with this, especially lately."
            ],
            sad: [
                "I hear that you're going through a difficult time. Thank you for trusting me with this.",
                "Feeling sad or down is a normal human experience, even though it's hard.",
                "It takes strength to reach out when you're feeling low. I'm here to listen."
            ],
            motivation: [
                "Struggling with motivation is something many people experience. It can be really frustrating.",
                "It's okay to have times when motivation feels low. You're not lazy or broken.",
                "Motivation comes and goes for everyone. What you're feeling is normal."
            ],
            relationships: [
                "Relationship challenges can be really stressful and emotionally draining.",
                "People are complicated, and relationships can be hard work sometimes.",
                "It sounds like you're dealing with some difficult relationship stuff."
            ],
            work: [
                "Work stress can really build up and affect other parts of your life.",
                "Job pressures can be overwhelming. It's important to acknowledge that stress.",
                "Work challenges are tough, especially when they follow you home."
            ],
            school: [
                "School can be really stressful with all the pressures and expectations.",
                "Academic stress is real and can affect your whole well-being.",
                "Being a student comes with unique challenges and pressures."
            ],
            anger: [
                "Anger is a normal emotion, even though it can feel overwhelming sometimes.",
                "It sounds like you're dealing with some frustrating situations.",
                "Feeling angry often means something important to you is being threatened or ignored."
            ],
            gratitude: [
                "You're very welcome. I'm glad I could be helpful.",
                "It means a lot to hear that. Thank you for sharing.",
                "I'm happy that you're feeling a bit better. You deserve support."
            ],
            general: [
                "Thank you for sharing that with me. I'm here to listen.",
                "I hear you. Would you like to tell me more about what's going on?",
                "It sounds like you have a lot on your mind. I'm here to support you."
            ]
        };
    }
}

// Export for use in HTML
window.MentalHealthSupport = MentalHealthSupport;