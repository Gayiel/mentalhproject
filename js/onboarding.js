// MindFlow Onboarding System
// Provides context-rich introduction before chat interaction
// Handles first-time user detection and demo mode initialization

class OnboardingSystem {
    constructor() {
        this.isFirstTime = !localStorage.getItem('mindflow_onboarded');
        this.isDemoMode = this.detectDemoMode();
        this.hasSeenIntro = localStorage.getItem('mindflow_intro_seen') === 'true';
        this.autoPlayIntro = localStorage.getItem('mindflow_auto_play') === 'true';
    }

    /**
     * Detect if running in demo mode (URL param or flag)
     */
    detectDemoMode() {
        const params = new URLSearchParams(window.location.search);
        return params.get('demo') === 'true' || localStorage.getItem('demo_mode') === 'true';
    }

    /**
     * PRIMARY: Initialize onboarding flow
     * Returns: Promise that resolves when onboarding complete
     */
    async initialize() {
        // If first time, show modal
        if (this.isFirstTime) {
            return this.showOnboardingModal();
        }

        // If demo mode and not seen intro, auto-play
        if (this.isDemoMode && !this.hasSeenIntro && this.autoPlayIntro) {
            return this.playDemoIntro();
        }

        // User is ready for chat
        return Promise.resolve();
    }

    /**
     * Show comprehensive onboarding modal
     */
    showOnboardingModal() {
        return new Promise((resolve) => {
            const modal = this.createOnboardingModal();
            document.body.appendChild(modal);

            // Smooth transition
            setTimeout(() => {
                modal.classList.add('show');
            }, 100);

            // Handle close button
            modal.querySelector('.onboarding-close')?.addEventListener('click', () => {
                this.closeOnboarding(modal, resolve);
            });

            // Handle "Get Started" button
            modal.querySelector('.onboarding-start-btn')?.addEventListener('click', () => {
                this.closeOnboarding(modal, resolve);
            });

            // Handle "Learn More" button
            modal.querySelector('.onboarding-learn-more-btn')?.addEventListener('click', () => {
                this.showDetailedAbout();
            });

            // Mark as onboarded
            localStorage.setItem('mindflow_onboarded', 'true');
        });
    }

    /**
     * Create the main onboarding modal DOM
     */
    createOnboardingModal() {
        const modal = document.createElement('div');
        modal.className = 'onboarding-modal';
        modal.innerHTML = `
            <div class="onboarding-overlay"></div>
            <div class="onboarding-content">
                <button class="onboarding-close" aria-label="Close onboarding">✕</button>
                
                <div class="onboarding-header">
                    <div class="onboarding-icon">🛡️</div>
                    <h1>Meet Your Crisis Detection Partner</h1>
                    <p class="onboarding-subtitle">Intelligent, compassionate support powered by AI and human experts</p>
                </div>

                <div class="onboarding-section problem-section">
                    <div class="section-number">1</div>
                    <h2>The Problem</h2>
                    <p>
                        Crisis moments often hide in plain language. When someone says "I can't do this anymore" 
                        or "Everyone would be better off without me," we might miss the urgency. 
                        <strong>Delayed recognition = delayed help.</strong>
                    </p>
                </div>

                <div class="onboarding-section approach-section">
                    <div class="section-number">2</div>
                    <h2>Our Approach</h2>
                    <p>
                        MindFlow combines advanced AI analysis with human professional oversight. 
                        We listen for both direct language AND subtle emotional cues—catching moments that matter.
                    </p>
                    <div class="approach-list">
                        <div class="approach-item">
                            <span class="approach-icon">🤖</span>
                            <span>AI emotional analysis</span>
                        </div>
                        <div class="approach-item">
                            <span class="approach-icon">📊</span>
                            <span>Multi-pattern detection</span>
                        </div>
                        <div class="approach-item">
                            <span class="approach-icon">🤝</span>
                            <span>Human expert review</span>
                        </div>
                        <div class="approach-item">
                            <span class="approach-icon">⚡</span>
                            <span>Instant escalation</span>
                        </div>
                    </div>
                </div>

                <div class="onboarding-section impact-section">
                    <div class="section-number">3</div>
                    <h2>Real-World Impact</h2>
                    <div class="impact-cards">
                        <div class="impact-card">
                            <h3>⏱️ Faster Detection</h3>
                            <p>Crisis moments identified in seconds, not hours</p>
                        </div>
                        <div class="impact-card">
                            <h3>🎯 Better Escalation</h3>
                            <p>Immediate connection to crisis resources (988, clinics, emergency services)</p>
                        </div>
                        <div class="impact-card">
                            <h3>💬 Never Missed</h3>
                            <p>Catches subtle language that humans might overlook</p>
                        </div>
                    </div>
                </div>

                <div class="onboarding-section who-section">
                    <h2>Who This Is For</h2>
                    <div class="who-list">
                        <div class="who-item">
                            <strong>🧑‍💼 Organizations:</strong> Deploy at scale to catch crisis moments across support channels
                        </div>
                        <div class="who-item">
                            <strong>👩‍⚕️ Counselors:</strong> Get AI-powered insights to enhance your practice, not replace it
                        </div>
                        <div class="who-item">
                            <strong>🙋 End Users:</strong> Talk freely knowing someone's listening for real emergencies
                        </div>
                    </div>
                </div>

                <div class="onboarding-footer">
                    <button class="onboarding-learn-more-btn">Learn More About Our Approach</button>
                    <button class="onboarding-start-btn primary">Get Started</button>
                </div>
            </div>
        `;

        return modal;
    }

    /**
     * Close onboarding modal
     */
    closeOnboarding(modal, callback) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.remove();
            callback();
        }, 300);
    }

    /**
     * Show detailed "About This Tool" section
     */
    showDetailedAbout() {
        const about = document.createElement('div');
        about.className = 'about-overlay';
        about.innerHTML = `
            <div class="about-modal">
                <button class="about-close" aria-label="Close about">✕</button>
                
                <div class="about-content">
                    <h1>About MindFlow Crisis Detection</h1>

                    <section class="about-section">
                        <h2>What We Do</h2>
                        <p>
                            MindFlow is an AI-powered crisis detection system that monitors conversations for signs of 
                            emotional distress or suicidal ideation. When crisis language is detected, the system immediately:
                        </p>
                        <ul>
                            <li>✅ Flags the conversation for human review</li>
                            <li>✅ Provides immediate crisis resources (988, text lines, emergency clinics)</li>
                            <li>✅ Escalates to licensed mental health professionals</li>
                            <li>✅ Maintains user privacy and HIPAA/GDPR compliance</li>
                        </ul>
                    </section>

                    <section class="about-section">
                        <h2>How It Works</h2>
                        <p>
                            Our detection system uses multiple layers of analysis:
                        </p>
                        <div class="how-it-works">
                            <div class="step">
                                <h3>Layer 1: Direct Language</h3>
                                <p>Identifies explicit crisis keywords: "suicide," "kill myself," "end my life"</p>
                            </div>
                            <div class="step">
                                <h3>Layer 2: Subtle Patterns</h3>
                                <p>Catches indirect language: "can't do this anymore," "no way out," "trapped"</p>
                            </div>
                            <div class="step">
                                <h3>Layer 3: Alienation Markers</h3>
                                <p>Detects isolation: "nobody cares," "burden to everyone," "should disappear"</p>
                            </div>
                            <div class="step">
                                <h3>Layer 4: Fatigue Signals</h3>
                                <p>Recognizes exhaustion: "so tired," "ready to go," "can't fight anymore"</p>
                            </div>
                            <div class="step">
                                <h3>Layer 5: Human Review</h3>
                                <p>Licensed professionals assess context and provide expert guidance</p>
                            </div>
                        </div>
                    </section>

                    <section class="about-section">
                        <h2>Crisis Resources Provided</h2>
                        <p>
                            When a crisis is detected, users immediately receive:
                        </p>
                        <div class="resources-grid">
                            <div class="resource">
                                <h3>🆘 US Crisis Support</h3>
                                <p><strong>988 Suicide & Crisis Lifeline</strong></p>
                                <p>Call 988 • Text HOME to 741741 • 24/7 available</p>
                            </div>
                            <div class="resource">
                                <h3>🏥 Emergency Services</h3>
                                <p><strong>Call 911</strong></p>
                                <p>For immediate danger or severe crisis</p>
                            </div>
                            <div class="resource">
                                <h3>🤝 Human Escalation</h3>
                                <p><strong>Licensed Professionals</strong></p>
                                <p>Immediate connection to crisis counselors</p>
                            </div>
                            <div class="resource">
                                <h3>🏢 Local Clinics</h3>
                                <p><strong>Mental Health Services</strong></p>
                                <p>Same-day and urgent therapy appointments</p>
                            </div>
                        </div>
                    </section>

                    <section class="about-section">
                        <h2>Privacy & Security</h2>
                        <p>
                            Your privacy is paramount:
                        </p>
                        <ul>
                            <li>🔒 <strong>HIPAA/GDPR Compliant</strong> - All data encrypted in transit</li>
                            <li>🔐 <strong>Anonymous Mode</strong> - Optional conversations without identification</li>
                            <li>🗑️ <strong>Data Control</strong> - Delete your entire conversation with one click</li>
                            <li>👁️ <strong>Human Review Only</strong> - Only licensed professionals see crisis flagged content</li>
                        </ul>
                    </section>

                    <section class="about-section">
                        <h2>The Problem We Solve</h2>
                        <p>
                            Crisis moments often hide in conversation. A person might say:
                        </p>
                        <div class="problem-examples">
                            <div class="example">
                                <p class="example-quote">"I can't do this anymore"</p>
                                <p class="example-note">This sounds like frustration but signals suicidal ideation</p>
                            </div>
                            <div class="example">
                                <p class="example-quote">"Everyone would be better off without me"</p>
                                <p class="example-note">Suggests burden and hopelessness—urgent warning signs</p>
                            </div>
                            <div class="example">
                                <p class="example-quote">"I don't know how much longer I can keep going"</p>
                                <p class="example-note">Indicates exhaustion and potential danger</p>
                            </div>
                        </div>
                        <p>
                            <strong>Traditional support systems might miss these cues.</strong> MindFlow catches them instantly 
                            and escalates to human professionals immediately.
                        </p>
                    </section>

                    <section class="about-section">
                        <h2>For Different Users</h2>
                        <div class="user-personas">
                            <div class="persona">
                                <h3>👤 End Users</h3>
                                <p>
                                    You can talk freely about what you're going through. MindFlow is here to listen 
                                    and ensure you get help if you need it—fast.
                                </p>
                            </div>
                            <div class="persona">
                                <h3>👩‍⚕️ Mental Health Professionals</h3>
                                <p>
                                    Use MindFlow to enhance your practice. AI flags potential crises so you can prioritize, 
                                    while you maintain full clinical control and decision-making authority.
                                </p>
                            </div>
                            <div class="persona">
                                <h3>🏢 Organizations</h3>
                                <p>
                                    Deploy across support channels—employee assistance programs, crisis hotlines, 
                                    therapeutic platforms. Catch more cases. Respond faster. Save lives.
                                </p>
                            </div>
                        </div>
                    </section>

                    <section class="about-section">
                        <h2>Important Note</h2>
                        <p>
                            <strong>⚠️ MindFlow is not a replacement for emergency services.</strong> 
                            If you or someone else is in immediate danger, please call 911 or your local emergency number. 
                            Crisis resources are always available—MindFlow simply helps identify moments when they're needed most.
                        </p>
                    </section>
                </div>
            </div>
        `;

        document.body.appendChild(about);

        // Close button handler
        about.querySelector('.about-close')?.addEventListener('click', () => {
            about.classList.add('closing');
            setTimeout(() => about.remove(), 300);
        });

        // Click outside to close
        about.querySelector('.about-overlay')?.addEventListener('click', (e) => {
            if (e.target === about.querySelector('.about-overlay')) {
                about.classList.add('closing');
                setTimeout(() => about.remove(), 300);
            }
        });
    }

    /**
     * Auto-play demo intro sequence
     * Shows context + auto-generates sample conversation
     */
    async playDemoIntro() {
        return new Promise(async (resolve) => {
            // Show demo context modal
            const demoModal = this.createDemoIntroModal();
            document.body.appendChild(demoModal);

            setTimeout(() => {
                demoModal.classList.add('show');
            }, 100);

            // Auto-close after 8 seconds or on click
            const autoClose = setTimeout(() => {
                this.closeDemoIntro(demoModal, resolve);
            }, 8000);

            // Handle manual close
            demoModal.querySelector('.demo-continue-btn')?.addEventListener('click', () => {
                clearTimeout(autoClose);
                this.closeDemoIntro(demoModal, resolve);
            });

            // Mark intro as seen
            localStorage.setItem('mindflow_intro_seen', 'true');
        });
    }

    /**
     * Create demo intro modal
     */
    createDemoIntroModal() {
        const modal = document.createElement('div');
        modal.className = 'demo-intro-modal';
        modal.innerHTML = `
            <div class="demo-overlay"></div>
            <div class="demo-content">
                <div class="demo-badge">DEMO</div>
                <h1>Crisis Detection in Real-Time</h1>
                <p>Watch how MindFlow instantly identifies subtle crisis language and escalates to help</p>
                
                <div class="demo-example">
                    <h3>Here's what happens when someone says...</h3>
                    <p class="demo-quote">"I can't do this anymore"</p>
                    <div class="demo-detection">
                        <div class="detection-indicator">
                            🚨 <strong>Crisis Detected</strong>
                        </div>
                        <p>AI recognizes this as indirect suicidal ideation</p>
                        <p style="margin-top: 8px; font-size: 13px; color: #64748b;">
                            ✓ Crisis resources provided instantly<br>
                            ✓ Human specialists notified<br>
                            ✓ Emergency escalation ready
                        </p>
                    </div>
                </div>

                <button class="demo-continue-btn">See It In Action →</button>
                <p class="demo-subtitle">This is a guided demonstration. Actual conversations are confidential.</p>
            </div>
        `;

        return modal;
    }

    /**
     * Close demo intro
     */
    closeDemoIntro(modal, callback) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.remove();
            callback();
        }, 300);
    }

    /**
     * Create "About This Tool" button for always-accessible reference
     * Should be added to chat interface
     */
    createAboutButton() {
        const btn = document.createElement('button');
        btn.className = 'about-tool-btn';
        btn.setAttribute('aria-label', 'Learn about this tool');
        btn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor">
                <circle cx="10" cy="10" r="9"></circle>
                <path d="M10 6v4"></path>
                <circle cx="10" cy="15" r="0.5" fill="currentColor"></circle>
            </svg>
            About
        `;
        btn.addEventListener('click', () => this.showDetailedAbout());
        return btn;
    }

    /**
     * Flag user as first-time for contextual explanations during chat
     */
    flagFirstTimeUser() {
        return this.isFirstTime;
    }

    /**
     * Get onboarding status for conditional rendering
     */
    getStatus() {
        return {
            isFirstTime: this.isFirstTime,
            isDemoMode: this.isDemoMode,
            hasSeenIntro: this.hasSeenIntro,
            onboarded: localStorage.getItem('mindflow_onboarded') === 'true'
        };
    }

    /**
     * Reset onboarding (useful for testing or returning users)
     */
    resetOnboarding() {
        localStorage.removeItem('mindflow_onboarded');
        localStorage.removeItem('mindflow_intro_seen');
        this.isFirstTime = true;
    }
}

// Initialize onboarding on page load
document.addEventListener('DOMContentLoaded', async () => {
    const onboarding = new OnboardingSystem();
    await onboarding.initialize();

    // Make globally available for integration with chatbot
    window.onboardingSystem = onboarding;
});
