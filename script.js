// --- Global Configuration and Setup ---
const MOOD_HISTORY_KEY = 'accessibleMoodHistory';
const CHART_ID = 'mood-chart';
let moodChartInstance; // Variable to hold the Chart.js instance
let currentViewDays = 7; // default view
let saveTimeout;

// --- Utility Functions ---

/**
 * Loads mood history from browser's local storage.
 * @returns {Array} List of mood log objects.
 */
function loadMoodHistory() {
    try {
        const history = localStorage.getItem(MOOD_HISTORY_KEY);
        return history ? JSON.parse(history) : [];
    } catch (e) {
        console.error("Error loading mood history:", e);
        return [];
    }
}

/**
 * Saves mood history to local storage.
 * @param {Array} history - The updated history array.
 */
function saveMoodHistory(history) {
    // debounce small bursts of saves
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        try {
            localStorage.setItem(MOOD_HISTORY_KEY, JSON.stringify(history));
        } catch (e) {
            console.error('Failed to save mood history:', e);
        }
    }, 120);
}

/* UI Helpers: toast notifications and lightweight confetti */
function showToast(message, type = 'info', timeout = 3000) {
    try {
        const area = document.getElementById('toast-area');
        if (!area) return;
        const t = document.createElement('div');
        t.className = 'toast ' + (type === 'success' ? 'success' : (type === 'warn' ? 'warn' : ''));
        const text = document.createElement('span'); text.textContent = message;
        t.appendChild(text);
        area.appendChild(t);
        // Allow optional action via data attributes or attached property
        if (t._action && typeof t._action === 'function') {
            const btn = document.createElement('button'); btn.className = 'action-btn'; btn.textContent = t._actionLabel || 'Open';
            btn.addEventListener('click', (ev) => { ev.stopPropagation(); t._action(); });
            t.appendChild(btn);
        }
        setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateY(-6px)'; }, timeout - 300);
        setTimeout(() => { t.remove(); }, timeout);
    } catch (e) { console.warn('showToast failed', e); }
}

function launchConfetti(count = 10) {
    try {
        const colors = ['#FFD166','#FFB6B6','#FFD27A','#9DE1D6','#FFB89B'];
        const areaRect = document.body.getBoundingClientRect();
        for (let i = 0; i < count; i++) {
            const el = document.createElement('div');
            el.className = 'confetti';
            el.style.background = colors[Math.floor(Math.random() * colors.length)];
            el.style.left = (50 + (Math.random() - 0.5) * 40) + '%';
            el.style.top = (10 + Math.random() * 10) + '%';
            el.style.opacity = '1';
            el.style.transform = `translateY(0) rotate(${Math.random() * 360}deg)`;
            el.style.transition = `transform ${800 + Math.random() * 600}ms cubic-bezier(.2,.8,.2,1), opacity 900ms ease`;
            document.body.appendChild(el);
            // trigger animation
            setTimeout(() => {
                const tx = (Math.random() - 0.5) * 300;
                const ty = 700 + Math.random() * 200;
                const rot = Math.random() * 720;
                el.style.transform = `translate(${tx}px, ${ty}px) rotate(${rot}deg)`;
                el.style.opacity = '0';
            }, 20 + Math.random() * 120);
            // cleanup
            setTimeout(() => { el.remove(); }, 1600);
        }
    } catch (e) { console.warn('launchConfetti failed', e); }
}

/* Reusable preview popup for a log entry (used by submit and View buttons) */
function showLogPreview(entry) {
    try {
        const existing = document.getElementById('log-preview');
        if (existing) existing.remove();
        const preview = document.createElement('div'); preview.id = 'log-preview';
        preview.className = 'card';
        preview.style.position = 'fixed'; preview.style.right = '18px'; preview.style.bottom = '18px'; preview.style.zIndex = 2200; preview.style.maxWidth = '360px';
        preview.style.boxShadow = '0 12px 36px rgba(0,0,0,0.06)';
        preview.innerHTML = `
            <div style="display:flex; justify-content:space-between; gap:8px; align-items:center;">
                <div>
                    <div style="font-weight:800">Log saved — ${entry.date}</div>
                    <div class="text-muted" style="font-size:0.9rem; margin-top:6px;">Mood: ${entry.mood} — ${entry.tags && entry.tags.length ? entry.tags.join(', ') : 'No tags'}</div>
                    <div style="margin-top:8px; color:var(--color-text);">${entry.notes ? (entry.notes.length > 140 ? entry.notes.slice(0,140)+'…' : entry.notes) : '<span class="text-muted">No notes</span>'}</div>
                </div>
                <div style="display:flex; flex-direction:column; gap:8px; margin-left:8px;">
                    <button id="preview-edit" class="secondary-btn">Edit</button>
                    <button id="preview-close" class="control-btn">Close</button>
                </div>
            </div>`;
    document.body.appendChild(preview);
    // make focusable and set ARIA
    preview.setAttribute('role', 'dialog');
    preview.setAttribute('aria-live', 'polite');
    preview.setAttribute('tabindex', '-1');
    // wire actions
    document.getElementById('preview-close').addEventListener('click', () => { preview.remove(); });
        document.getElementById('preview-edit').addEventListener('click', () => {
            // populate form for quick editing (no redirect)
            const input = document.querySelector(`input[name="mood"][value="${entry.mood}"]`);
            if (input) input.checked = true;
            document.getElementById('activity-tags').value = (entry.tags || []).join(', ');
            document.getElementById('mood-notes').value = entry.notes || '';
            // focus notes for editing and remove preview
            document.getElementById('mood-notes').focus();
            preview.remove();
        });
    // move focus into preview for keyboard users
    setTimeout(() => { try { preview.focus(); } catch (e) {} }, 60);
    // auto-dismiss after a time unless user interacts
    setTimeout(() => { if (document.getElementById('log-preview')) preview.remove(); }, 7000);
    } catch (err) { console.warn('showLogPreview failed', err); }
}

// --- Core Functionality ---

/**
 * Renders or updates the Chart.js visualization.
 * @param {Array} data - The mood log data to display.
 */
function renderMoodChart(data) {
    renderMoodChartForDays(data, currentViewDays);
}

/**
 * Render chart for a configurable number of days
 */
function renderMoodChartForDays(data, days) {
    const startDate = new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const recentData = data.filter(log => log.date >= startDate).sort((a,b) => a.date.localeCompare(b.date));

    // build a map for O(1) lookups
    const dateMap = Object.create(null);
    recentData.forEach(log => { dateMap[log.date] = log; });

    // Prepare labels for each day in range to show gaps clearly
    const labels = [];
    const moodScores = [];
    for (let i = 0; i < days; i++) {
        const d = new Date();
        d.setDate(d.getDate() - (days - 1 - i));
        const iso = d.toISOString().split('T')[0];
        labels.push(d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }));
        const found = dateMap[iso];
        moodScores.push(found ? found.mood : null);
    }

    // 2. Destroy previous instance if it exists to avoid memory leaks/errors
    if (moodChartInstance) {
        moodChartInstance.destroy();
    }

    const ctx = document.getElementById(CHART_ID).getContext('2d');
    
    // 3. Create new Chart instance (Line Chart for Trend)
    const isMonthly = days > 14;
    const datasetConfig = isMonthly ? {
        label: 'Daily Mood (30 days)',
        data: moodScores,
        backgroundColor: moodScores.map(score => score ? (getComputedStyle(document.documentElement).getPropertyValue('--mood-' + score).trim() || '#6F42C1') : 'rgba(0,0,0,0.04)'),
        borderColor: 'rgba(0,0,0,0)',
        borderWidth: 0
    } : {
        label: 'Daily Average Mood',
        data: moodScores,
        borderColor: getComputedStyle(document.documentElement).getPropertyValue('--accent-teal').trim() || '#2ec4b6',
        backgroundColor: 'rgba(46,196,182,0.12)',
        tension: 0.35,
        spanGaps: false,
        pointBackgroundColor: moodScores.map(score => score ? (getComputedStyle(document.documentElement).getPropertyValue('--mood-' + score).trim() || '#6F42C1') : 'rgba(0,0,0,0.06)'),
        pointRadius: 6,
        borderWidth: 3
    };

    moodChartInstance = new Chart(ctx, {
        type: isMonthly ? 'bar' : 'line',
        data: {
            labels: labels,
            datasets: [datasetConfig]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    min: 0,
                    max: 6,
                    ticks: {
                        stepSize: 1,
                        callback: function(value) {
                            const moodLabels = { 5: 'Very Good', 4: 'Good', 3: 'Neutral', 2: 'Bad', 1: 'Very Bad' };
                            return moodLabels[value] || '';
                        }
                    }
                }
            },
            plugins: {
                legend: { display: false },
                title: { display: true, text: isMonthly ? `${days}-Day Mood Overview` : `${days}-Day Mood Trend` }
            },
            interaction: { mode: 'index', intersect: false }
        }
    });

    // Toggle no-data overlay visibility
    const hasAnyData = moodScores.some(v => v !== null && v !== undefined);
    const noDataEl = document.getElementById('no-data');
    if (noDataEl) {
        noDataEl.setAttribute('aria-hidden', hasAnyData ? 'true' : 'false');
        noDataEl.style.display = hasAnyData ? 'none' : 'flex';
    }

    // Also update the logs list UI
    renderLogsList(data);
}

/**
 * Renders the list of past logs into the #logs-container element.
 */
function renderLogsList(history) {
    const container = document.getElementById('logs-container');
    if (!container) return;
    container.innerHTML = '';
    if (!history || history.length === 0) {
        const p = document.createElement('p'); p.className = 'text-muted'; p.textContent = 'No logs yet. Your entries will appear here.';
        container.appendChild(p); return;
    }

    // Sort descending by date
    const sorted = history.slice().sort((a,b) => b.date.localeCompare(a.date));
    sorted.forEach(entry => {
        const item = document.createElement('div');
        item.className = 'log-item';
        item.style.display = 'flex'; item.style.justifyContent = 'space-between'; item.style.alignItems = 'center'; item.style.gap = '12px'; item.style.padding = '8px 0';

        const left = document.createElement('div');
        const d = document.createElement('div'); d.textContent = new Date(entry.date).toLocaleDateString(); d.style.fontWeight = '700';
        const meta = document.createElement('div'); meta.className = 'text-muted'; meta.style.fontSize = '0.9rem'; meta.textContent = `Mood: ${entry.mood} — ${entry.tags ? entry.tags.join(', ') : ''}`;
        left.appendChild(d); left.appendChild(meta);

        const actions = document.createElement('div');
        const viewBtn = document.createElement('button'); viewBtn.className = 'secondary-btn'; viewBtn.textContent = 'View';
        viewBtn.addEventListener('click', () => {
            // show a preview popout for the selected entry (no redirect)
            showLogPreview(entry);
        });

        const delBtn = document.createElement('button'); delBtn.className = 'control-btn'; delBtn.textContent = 'Delete';
        delBtn.addEventListener('click', () => {
            if (!confirm('Delete this log?')) return;
            const idx = history.findIndex(h => h.date === entry.date);
            if (idx !== -1) { history.splice(idx,1); saveMoodHistory(history); renderMoodChart(history); checkContextualSupport(history); }
            // feedback
            showToast('Log deleted', 'warn');
            launchConfetti(6);
        });

        actions.appendChild(viewBtn); actions.appendChild(delBtn);
        item.appendChild(left); item.appendChild(actions);
        container.appendChild(item);
    });
}

/**
 * Checks for a negative mood pattern and shows the resource banner if necessary.
 * Meets the requirement for guided, contextual help.
 * @param {Array} data - The mood log data.
 */
function checkContextualSupport(data) {
    const today = new Date().toISOString().split('T')[0];
    // Calculate date exactly 7 days ago
    const oneWeekAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const recentLogs = data.filter(log => log.date >= oneWeekAgo && log.date <= today);

    // Check for 3 or more "Bad" (2) or "Very Bad" (1) logs in the last 7 days
    const negativeMoodCount = recentLogs.filter(log => log.mood <= 2).length;

    const banner = document.getElementById('resource-banner');

    if (negativeMoodCount >= 3) {
        banner.classList.remove('hidden');
        // ARIA live region ensures screen reader users are alerted
    } else {
        banner.classList.add('hidden');
    }
}

// --- Event Listeners and Initial Load ---

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initial Setup
    const now = new Date();
    document.getElementById('current-date').textContent = now.toLocaleDateString('en-US');
    document.getElementById('current-date').setAttribute('datetime', now.toISOString().split('T')[0]);
    let moodHistory = loadMoodHistory();
    renderMoodChart(moodHistory); // Initial chart display
    renderLogsList(moodHistory);
    checkContextualSupport(moodHistory); 

    // Ensure softer-colors toggle is wired early so first click responds
    (function initSoftToggleEarly() {
        const softToggle = document.getElementById('toggle-soft-btn');
        if (!softToggle) return;
        // If script earlier attached a handler inside checkContextualSupport, ensure aria state reflects stored value
        const savedOn = localStorage.getItem('softThemeEnabled') === 'true';
        softToggle.setAttribute('aria-pressed', savedOn);
    })();

    // Create an offscreen live region for status messages (if not present)
    if (!document.getElementById('live-status')) {
        const live = document.createElement('div');
        live.id = 'live-status';
        live.className = 'sr-only';
        live.setAttribute('aria-live', 'polite');
        document.body.appendChild(live);
    }
    const liveStatus = document.getElementById('live-status');

    // 2. Mood Log Submission Handler
    document.getElementById('mood-log-form').addEventListener('submit', (e) => {
        e.preventDefault();

        // Error check: Ensure a mood is selected
        const moodInput = document.querySelector('input[name="mood"]:checked');
        if (!moodInput) {
            showToast('Please select a mood before logging.', 'warn');
            return;
        }

        const newLog = {
            date: new Date().toISOString().split('T')[0],
            mood: parseInt(moodInput.value),
            tags: document.getElementById('activity-tags').value.split(',').map(t => t.trim()).filter(t => t),
            notes: document.getElementById('mood-notes').value
        };
        
        // Add log (check for and prevent duplicate log on the same day - Bug Fix)
        const logIndex = moodHistory.findIndex(log => log.date === newLog.date);
        if (logIndex !== -1) {
            // Overwrite existing log for today
            moodHistory[logIndex] = newLog;
        } else {
            moodHistory.push(newLog);
        }

        saveMoodHistory(moodHistory);

        // Update UI
    renderMoodChart(moodHistory);
        checkContextualSupport(moodHistory); 

        // Clear only optional fields for quick subsequent use
    // Reset form (clears radios and text fields)
    const form = document.getElementById('mood-log-form');
    if (form) form.reset();
    // Immediately focus the tags input to encourage contextual notes
    const tags = document.getElementById('activity-tags');
    if (tags) tags.focus();

        // Simple confirmation for accessibility
        document.getElementById('log-mood-btn').textContent = "Mood Logged!";
        setTimeout(() => {
            document.getElementById('log-mood-btn').textContent = "Log My Mood";
        }, 2000);

        // Announce to assistive tech
        if (liveStatus) {
            liveStatus.textContent = `Mood logged for ${newLog.date}`;
            setTimeout(() => { liveStatus.textContent = ''; }, 2500);
        }
        // show live toast and confetti
        showToast('Mood logged', 'success');
        launchConfetti(10);

        // If mood is low (2 or 1), offer immediate assistance options
        if (newLog.mood <= 2) {
            // non-blocking assistance prompt: toast with action buttons appended to a small inline container
            showToast('We noticed a low mood. Resources and help are available.', 'warn', 6000);
            // show the resource banner prominently
            const banner = document.getElementById('resource-banner');
            if (banner) {
                banner.classList.remove('hidden');
                banner.setAttribute('aria-hidden', 'false');
            }
            // Create a subtle inline assistance panel under the form with quick actions
            const logger = document.getElementById('mood-logger');
            if (logger && !document.getElementById('quick-assist')) {
                const panel = document.createElement('div'); panel.id = 'quick-assist';
                panel.className = 'card'; panel.style.marginTop = '12px'; panel.style.display = 'flex'; panel.style.gap = '8px'; panel.style.alignItems = 'center';
                panel.innerHTML = `
                    <div style="flex:1"><strong>Immediate help</strong><div class="text-muted">If you're feeling overwhelmed, these options may help.</div></div>
                    <div style="display:flex; gap:8px">
                        <button id="assist-resources" class="secondary-btn">Resources</button>
                        <button id="assist-hotline" class="primary-btn">Call Hotline</button>
                        <button id="assist-close" class="qa-close">Dismiss</button>
                    </div>`;
                logger.appendChild(panel);
                // wire actions
                document.getElementById('assist-resources').addEventListener('click', () => { window.location.href = 'resources.html'; });
                document.getElementById('assist-hotline').addEventListener('click', () => {
                    // region-aware hotline mapping
                    const region = document.getElementById('hotline-region') ? document.getElementById('hotline-region').value : (localStorage.getItem('hotlineRegion') || 'us');
                    const map = { us: 'tel:+18002738255', uk: 'tel:+447912345678', au: 'tel:+611300659467' };
                    const tel = map[region] || map['us'];
                    window.open(tel, '_self');
                });
                document.getElementById('assist-close').addEventListener('click', () => { const q = document.getElementById('quick-assist'); if (q) q.remove(); });
            }
        }
        // Show a small non-blocking preview popup summarizing the saved log
        try { showLogPreview(newLog); } catch (e) { console.warn('preview call failed', e); }
    });
    
    // View toggle buttons (7 day / 30 day)
    document.getElementById('view-7-day').addEventListener('click', (e) => {
        currentViewDays = 7;
        document.getElementById('view-7-day').classList.add('active');
        document.getElementById('view-30-day').classList.remove('active');
        renderMoodChart(moodHistory);
    });
    document.getElementById('view-30-day').addEventListener('click', (e) => {
        currentViewDays = 30;
        document.getElementById('view-30-day').classList.add('active');
        document.getElementById('view-7-day').classList.remove('active');
        renderMoodChart(moodHistory);
    });

    // Collapse/Expand the Trends section
    const toggleHistoryBtn = document.getElementById('toggle-history-btn');
    if (toggleHistoryBtn) {
        toggleHistoryBtn.addEventListener('click', () => {
            const chart = document.getElementById('mood-chart-container');
            const logs = document.getElementById('log-list');
            const expanded = toggleHistoryBtn.getAttribute('aria-expanded') === 'true';
            if (chart) chart.classList.toggle('collapsed', expanded);
            if (logs) logs.classList.toggle('collapsed', expanded);
            toggleHistoryBtn.setAttribute('aria-expanded', (!expanded).toString());
            toggleHistoryBtn.textContent = expanded ? 'Expand' : 'Collapse';
        });
    }

    // Keyboard support for control buttons (Enter/Space)
    document.addEventListener('keydown', (ev) => {
        // Close modal on Escape
        if (ev.key === 'Escape') {
            const modal = document.getElementById('settings-modal');
            if (modal && !modal.classList.contains('hidden')) modal.classList.add('hidden');
        }
    });

    document.querySelectorAll('.control-btn').forEach(btn => btn.setAttribute('tabindex', '0'));
    // delegated handler for Space/Enter activation
    document.body.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
            const target = ev.target;
            if (target && target.classList && target.classList.contains('control-btn')) {
                ev.preventDefault(); target.click();
            }
        }
    });

    // Add small utility buttons to the filter-controls: Export / Import / Clear
    const fc = document.querySelector('.filter-controls');
    if (fc) {
        const exportBtn = document.createElement('button');
        exportBtn.type = 'button';
        exportBtn.className = 'control-btn';
        exportBtn.textContent = 'Export';
        exportBtn.addEventListener('click', () => {
            const dataStr = JSON.stringify(moodHistory, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = 'mood-history.json';
            document.body.appendChild(a); a.click(); a.remove();
            URL.revokeObjectURL(url);
        });

        // Create file input for safer import
        const importBtn = document.createElement('button');
        importBtn.type = 'button';
        importBtn.className = 'control-btn';
        importBtn.textContent = 'Import';
        const fileInput = document.createElement('input');
        fileInput.type = 'file'; fileInput.accept = 'application/json'; fileInput.style.display = 'none';
        fileInput.addEventListener('change', (ev) => {
            const f = ev.target.files && ev.target.files[0];
            if (!f) return;
            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const parsed = JSON.parse(reader.result);
                    if (!Array.isArray(parsed)) throw new Error('Invalid format');
                    const valid = parsed.filter(p => p && p.date && p.mood);
                    if (valid.length === 0) { showToast('No valid entries found in import.', 'warn'); return; }
                    const map = Object.create(null);
                    moodHistory.forEach(m => { map[m.date] = m; });
                    valid.forEach(v => { map[v.date] = v; });
                    moodHistory = Object.values(map).sort((a,b) => a.date.localeCompare(b.date));
                    saveMoodHistory(moodHistory);
                    renderMoodChart(moodHistory);
                    checkContextualSupport(moodHistory);
                    showToast('Import completed', 'success');
                } catch (err) { showToast('Import failed: ' + err.message, 'warn'); }
            };
            reader.readAsText(f);
        });
        importBtn.addEventListener('click', () => fileInput.click());
        fc.appendChild(fileInput);

        const clearBtn = document.createElement('button');
        clearBtn.type = 'button';
        clearBtn.className = 'control-btn';
        clearBtn.textContent = 'Clear';
        clearBtn.addEventListener('click', () => {
            // transient undo: snapshot then clear
            const backup = moodHistory.slice();
            moodHistory = [];
            saveMoodHistory(moodHistory);
            renderMoodChart(moodHistory);
            checkContextualSupport(moodHistory);
            showToast('All logs cleared — undo available on reload', 'warn');
            // Note: For a full undo UI we'd keep a temporary store and show an action in the toast.
        });

        // append with spacing
        const spacer = document.createElement('span'); spacer.style.marginLeft = '8px';
        fc.appendChild(spacer);
        fc.appendChild(exportBtn);
        fc.appendChild(importBtn);
        fc.appendChild(clearBtn);
    }

    // Keyboard support for mood labels (space/enter toggles input)
    document.querySelectorAll('.mood-label').forEach(label => {
        label.setAttribute('tabindex', '0');
        label.addEventListener('keydown', (ev) => {
            if (ev.key === ' ' || ev.key === 'Enter') {
                ev.preventDefault();
                const forId = label.getAttribute('for');
                const input = document.getElementById(forId);
                if (input) input.click();
            }
        });
    });

    // Bottom nav behavior: smooth scroll and active state
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const href = btn.getAttribute('data-href');
            if (href) { window.location.href = href; return; }
            const targetId = btn.getAttribute('data-target');
            const target = document.getElementById(targetId);
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // If it's the logger, focus the first interactive element
                if (targetId === 'mood-logger') {
                    const firstInput = document.querySelector('#mood-log-form input[name="mood"]');
                    if (firstInput) firstInput.focus();
                }
            }
            navButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
        btn.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); btn.click(); } });
    });

    // Observe sections to update active nav button
    const sectionIds = ['mood-logger', 'mood-history', 'resource-banner'];
    const observer = new IntersectionObserver(entries => {
        entries.forEach(en => {
            if (en.isIntersecting) {
                const id = en.target.id;
                navButtons.forEach(b => {
                    if (b.getAttribute('data-target') === id) {
                        b.classList.add('active');
                    } else {
                        b.classList.remove('active');
                    }
                });
            }
        });
    }, { threshold: 0.45 });
    sectionIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) observer.observe(el);
    });

    // Find Nearby Support: use Geolocation to open a maps query for 'mental health center' near user
    const findBtn = document.getElementById('find-support-btn');
    if (findBtn) {
        findBtn.addEventListener('click', () => {
            if (!navigator.geolocation) {
                // Fallback to a Google Maps search
                window.open('https://www.google.com/maps/search/mental+health+center+near+me', '_blank');
                return;
            }
            findBtn.disabled = true; findBtn.textContent = 'Locating...';
            navigator.geolocation.getCurrentPosition((pos) => {
                const { latitude, longitude } = pos.coords;
                const url = `https://www.google.com/maps/search/mental+health+center/@${latitude},${longitude},12z`;
                window.open(url, '_blank');
                findBtn.disabled = false; findBtn.textContent = 'Find Nearby Support';
            }, (err) => {
                console.warn('Geolocation failed', err);
                window.open('https://www.google.com/maps/search/mental+health+center+near+me', '_blank');
                findBtn.disabled = false; findBtn.textContent = 'Find Nearby Support';
            }, { timeout: 8000 });
        });
    }

    // Guard Chart creation and announce resource-banner changes via live-status
    const originalCheckContextualSupport = checkContextualSupport;
    window.checkContextualSupport = function(data) {
        try {
            originalCheckContextualSupport(data);
            const banner = document.getElementById('resource-banner');
            const liveStatus = document.getElementById('live-status');
            if (banner && liveStatus) {
                if (!banner.classList.contains('hidden')) {
                    banner.setAttribute('aria-hidden', 'false');
                    liveStatus.textContent = 'We noticed a pattern that suggests additional help may be useful.';
                    setTimeout(() => { liveStatus.textContent = ''; }, 3000);
                } else {
                    banner.setAttribute('aria-hidden', 'true');
                }
            }

                // Softer color toggle — pick a random aesthetically-pleasing soft palette and apply via CSS variables
                const softToggle = document.getElementById('toggle-soft-btn');
                if (softToggle) {
                    // Palette bank: each defines a small set of CSS variables used by the stylesheet
                    const PALETTES = {
                        'sunny-cream': {
                            '--app-bg-top': '#fffaf0', '--app-bg-bottom': '#fff6d6', '--color-text': '#2b2b2b',
                            '--accent-teal': '#8bd3c7', '--accent-purple': '#c99bd9',
                            '--mood-5': '#FFD166', '--mood-4': '#FFC4A3', '--mood-3': '#F7E9B9', '--mood-2': '#C7D3F8', '--mood-1': '#EED7D7',
                            '--glass-bg': 'rgba(255,255,255,0.7)', '--glass-border': 'rgba(0,0,0,0.06)', '--button-bg': '#fff', '--button-text': '#2b2b2b'
                        },
                        'lavender-mist': {
                            '--app-bg-top': '#fbf7ff', '--app-bg-bottom': '#f3eefb', '--color-text': '#221f3b',
                            '--accent-teal': '#9ee6d4', '--accent-purple': '#b89ffb',
                            '--mood-5': '#E6D6FF', '--mood-4': '#D9C1FF', '--mood-3': '#EDE7FF', '--mood-2': '#C6D8FF', '--mood-1': '#F2DDE6',
                            '--glass-bg': 'rgba(250,246,255,0.75)', '--glass-border': 'rgba(120,108,180,0.06)', '--button-bg': '#fff', '--button-text': '#221f3b'
                        },
                        'sea-breeze': {
                            '--app-bg-top': '#f7fffd', '--app-bg-bottom': '#eefaf8', '--color-text': '#163243',
                            '--accent-teal': '#6fd3c2', '--accent-purple': '#a3d5ff',
                            '--mood-5': '#B6F0E0', '--mood-4': '#9DE1D6', '--mood-3': '#E8F6F3', '--mood-2': '#C7E7F2', '--mood-1': '#FFDDE6',
                            '--glass-bg': 'rgba(255,255,255,0.72)', '--glass-border': 'rgba(20,50,60,0.06)', '--button-bg': '#ffffff', '--button-text': '#163243'
                        },
                        'peach-rose': {
                            '--app-bg-top': '#fff7f5', '--app-bg-bottom': '#fff1ec', '--color-text': '#3b2b2a',
                            '--accent-teal': '#ffd6b6', '--accent-purple': '#ffb3c1',
                            '--mood-5': '#FFDAB9', '--mood-4': '#FFC4A3', '--mood-3': '#FCEEDC', '--mood-2': '#FFD1E0', '--mood-1': '#F0C7C7',
                            '--glass-bg': 'rgba(255,255,255,0.75)', '--glass-border': 'rgba(200,140,120,0.06)', '--button-bg': '#fff', '--button-text': '#3b2b2a'
                        },
                        'soft-sky': {
                            '--app-bg-top': '#fbfdff', '--app-bg-bottom': '#f0f8ff', '--color-text': '#0f2540',
                            '--accent-teal': '#8fd3ff', '--accent-purple': '#c9e4ff',
                            '--mood-5': '#DFF7FF', '--mood-4': '#CFEFFF', '--mood-3': '#EAF7FF', '--mood-2': '#D1E9FF', '--mood-1': '#FFE9F0',
                            '--glass-bg': 'rgba(255,255,255,0.7)', '--glass-border': 'rgba(10,40,70,0.06)', '--button-bg': '#ffffff', '--button-text': '#0f2540'
                        }
                    };

                    // Determine which CSS vars we will toggle (union of palette keys)
                    const PALETTE_KEYS = Object.keys(PALETTES[Object.keys(PALETTES)[0]]);

                    // Capture the site's default values so we can revert when soft-theme is turned off
                    const defaultPalette = {};
                    PALETTE_KEYS.forEach(k => {
                        defaultPalette[k] = getComputedStyle(document.documentElement).getPropertyValue(k) || '';
                    });

                    function applyPaletteObject(obj) {
                        PALETTE_KEYS.forEach(k => {
                            if (obj && obj[k]) document.documentElement.style.setProperty(k, obj[k]);
                            else document.documentElement.style.removeProperty(k);
                        });
                    }

                    function applyPaletteByName(name) {
                        const p = PALETTES[name];
                        if (!p) return;
                        applyPaletteObject(p);
                        localStorage.setItem('softThemePalette', name);
                    }

                    function clearPalette() {
                        // revert to default values captured on page load
                        applyPaletteObject(defaultPalette);
                        localStorage.removeItem('softThemePalette');
                    }

                    function pickRandomPalette(exclude) {
                        const names = Object.keys(PALETTES).filter(n => n !== exclude);
                        return names[Math.floor(Math.random() * names.length)];
                    }

                    const applySoft = (on, paletteName) => {
                        document.documentElement.classList.toggle('soft-theme', !!on);
                        softToggle.setAttribute('aria-pressed', !!on);
                        localStorage.setItem('softThemeEnabled', !!on);
                        if (on) {
                            // choose the provided paletteName or pick a random one
                            const chosen = paletteName || localStorage.getItem('softThemePalette') || pickRandomPalette();
                            applyPaletteByName(chosen);
                            softToggle.textContent = 'Softer colors';
                        } else {
                            clearPalette();
                        }
                    };

                    // initialize from saved preference and palette
                    const savedOn = localStorage.getItem('softThemeEnabled') === 'true';
                    const savedPalette = localStorage.getItem('softThemePalette');
                    if (savedOn && savedPalette) applyPaletteByName(savedPalette);
                    applySoft(savedOn, savedPalette);

                    // Clicking toggles the soft theme on/off; when enabling, pick a random pleasant palette
                    softToggle.addEventListener('click', () => {
                        const currentlyOn = localStorage.getItem('softThemeEnabled') === 'true';
                        if (!currentlyOn) {
                            // enable and pick a new random palette
                            const prev = localStorage.getItem('softThemePalette');
                            const next = pickRandomPalette(prev);
                            applySoft(true, next);
                            showToast('Applied a fresh soft palette', 'info');
                        } else {
                            // disable and revert
                            applySoft(false);
                            showToast('Reverted to default palette', 'info');
                        }
                    });
                }

                // -- Self-test runner (manual trigger via ?selftest=1) --
                async function runSelfTest() {
                    const results = [];
                    const add = (k, ok, info) => { results.push({ test: k, ok: !!ok, info: info || '' }); console.log(k, ok, info || ''); };

                    try {
                        // 1) Elements present
                        const elems = ['mood-log-form','mood-chart','view-7-day','view-30-day','find-support-btn','logs-container','toggle-soft-btn'];
                        elems.forEach(id => add(`element:${id}`, !!document.getElementById(id)));

                        // 2) Simulate a mood log submission
                        const form = document.getElementById('mood-log-form');
                        if (form) {
                            // ensure a mood radio exists and set it
                            const radio = document.querySelector('input[name="mood"]');
                            if (radio) radio.checked = true;
                            const tags = document.getElementById('activity-tags'); if (tags) tags.value = 'TestTag';
                            const notes = document.getElementById('mood-notes'); if (notes) notes.value = 'Automated self-test note';

                            // submit
                            form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

                            // wait for debounced save & UI update
                            await new Promise(r => setTimeout(r, 400));

                            const saved = loadMoodHistory();
                            add('saveToLocalStorage', Array.isArray(saved) && saved.length > 0, `saved=${saved.length}`);

                            const logsContainer = document.getElementById('logs-container');
                            add('logsRendered', logsContainer && logsContainer.querySelectorAll('.log-item').length > 0, `rendered=${logsContainer ? logsContainer.querySelectorAll('.log-item').length : 0}`);
                        } else {
                            add('formPresent', false);
                        }

                        // 3) Soft theme toggle
                        const toggle = document.getElementById('toggle-soft-btn');
                        if (toggle) {
                            const before = document.documentElement.classList.contains('soft-theme');
                            toggle.click();
                            await new Promise(r => setTimeout(r, 120));
                            const after = document.documentElement.classList.contains('soft-theme');
                            add('softToggle', before !== after, `before=${before} after=${after}`);
                            // revert to saved state
                            toggle.click();
                        } else add('softToggle', false);

                        // 4) Find Nearby Support should call window.open (we capture it)
                        const findBtn = document.getElementById('find-support-btn');
                        if (findBtn) {
                            const originalOpen = window.open;
                            let captured = null;
                            window.open = function(url, target) { captured = url; return originalOpen.apply(this, arguments); };
                            // Click and wait briefly
                            findBtn.click();
                            await new Promise(r => setTimeout(r, 1500));
                            add('findSupportOpen', !!captured, `opened=${captured}`);
                            window.open = originalOpen;
                        } else add('findSupportOpen', false);

                    } catch (err) {
                        console.error('SelfTest error', err);
                        results.push({ test: 'selftest-exception', ok: false, info: String(err) });
                    }

                    // Render results visibly
                    const boxId = 'selftest-results';
                    let box = document.getElementById(boxId);
                    if (!box) {
                        box = document.createElement('div'); box.id = boxId;
                        box.style.position = 'fixed'; box.style.right = '18px'; box.style.bottom = '18px'; box.style.zIndex = 1200;
                        box.style.maxWidth = '360px'; box.style.fontFamily = 'Inter, system-ui, sans-serif';
                        document.body.appendChild(box);
                    }
                    box.innerHTML = '';
                    const header = document.createElement('div'); header.style.fontWeight = 800; header.textContent = 'Self-test Results'; box.appendChild(header);
                    results.forEach(r => {
                        const row = document.createElement('div'); row.style.padding = '6px 8px'; row.style.marginTop = '6px'; row.style.borderRadius = '8px';
                        row.style.background = r.ok ? 'rgba(46,196,182,0.08)' : 'rgba(220,53,69,0.06)';
                        row.textContent = `${r.ok ? 'PASS' : 'FAIL'} — ${r.test} ${r.info ? ' — ' + r.info : ''}`;
                        box.appendChild(row);
                    });

                    console.table(results);
                }

                if (location.search && location.search.includes('selftest=1')) {
                    // run after a short delay so page finishes initialization
                    setTimeout(() => { runSelfTest(); }, 600);
                }
        } catch (e) {
            console.error('checkContextualSupport failed', e);
        }
    };

    // Settings modal wiring
    const settingsBtn = document.querySelector('.icon-btn[aria-label="Settings"]');
    const settingsModal = document.getElementById('settings-modal');
    const settingsClose = document.getElementById('settings-close');
    const settingsAbout = document.getElementById('settings-about');
    const hotlineRegion = document.getElementById('hotline-region');
    if (settingsBtn && settingsModal) {
        settingsBtn.addEventListener('click', () => { settingsModal.classList.remove('hidden'); });
    }
    if (settingsClose) settingsClose.addEventListener('click', () => { settingsModal.classList.add('hidden'); });
    if (settingsAbout) settingsAbout.addEventListener('click', () => { showToast('MoodHouse — a private mood journaling tool', 'info'); });
    if (hotlineRegion) {
        // load saved region
        const saved = localStorage.getItem('hotlineRegion') || 'us';
        hotlineRegion.value = saved;
        hotlineRegion.addEventListener('change', () => { localStorage.setItem('hotlineRegion', hotlineRegion.value); showToast('Hotline region saved', 'info'); });
    }
    
    // Note: The Monthly Summary button logic is omitted for brevity but would involve
    // re-filtering the data and re-calling renderMoodChart with different chart options (e.g., a bar chart or calendar view).
});