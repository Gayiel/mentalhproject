// Accessibility Enhancement Functions for MindFlow Sanctuary
// Provides user-controlled accessibility settings

// Open accessibility panel
function openAccessibilityPanel() {
  const panel = document.getElementById('accessibility-panel');
  if (panel) {
    panel.setAttribute('aria-hidden', 'false');
    const firstFocusable = panel.querySelector('button, select, input');
    if (firstFocusable) firstFocusable.focus();
  }
}

// Close accessibility panel
function closeAccessibilityPanel() {
  const panel = document.getElementById('accessibility-panel');
  if (panel) {
    panel.setAttribute('aria-hidden', 'true');
    document.getElementById('accessibility-toggle')?.focus();
  }
}

// Change font size
function changeFontSize(sizeClass) {
  const body = document.body;
  // Remove existing size classes
  body.classList.remove('font-size-small', 'font-size-normal', 'font-size-large', 'font-size-xlarge');
  // Add new size class
  body.classList.add(sizeClass);
  // Save preference
  localStorage.setItem('mf-font-size', sizeClass);
  // Announce to screen reader
  announceChange(`Font size changed to ${sizeClass.replace('font-size-', '')}`);
}

// Toggle high readability mode
function toggleHighReadability(enabled) {
  document.body.classList.toggle('high-readability', enabled);
  localStorage.setItem('mf-high-readability', enabled);
  announceChange(`High readability mode ${enabled ? 'enabled' : 'disabled'}`);
}

// Toggle dyslexia-friendly font
function toggleDyslexiaFont(enabled) {
  document.body.classList.toggle('dyslexia-friendly', enabled);
  localStorage.setItem('mf-dyslexia-font', enabled);
  announceChange(`Dyslexia-friendly font ${enabled ? 'enabled' : 'disabled'}`);
}

// Toggle reduced motion
function toggleReduceMotion(enabled) {
  if (enabled) {
    document.documentElement.style.setProperty('--animation-duration', '0.01ms');
    document.documentElement.style.setProperty('--transition-duration', '0.01ms');
  } else {
    document.documentElement.style.removeProperty('--animation-duration');
    document.documentElement.style.removeProperty('--transition-duration');
  }
  localStorage.setItem('mf-reduce-motion', enabled);
  announceChange(`Reduced motion ${enabled ? 'enabled' : 'disabled'}`);
}

// Announce changes to screen readers
function announceChange(message) {
  const liveRegion = document.getElementById('sr-live-region');
  if (liveRegion) {
    liveRegion.textContent = message;
    setTimeout(() => {
      liveRegion.textContent = '';
    }, 1000);
  }
}

// Load saved accessibility preferences on page load
function loadAccessibilityPreferences() {
  // Font size
  const fontSize = localStorage.getItem('mf-font-size');
  if (fontSize) {
    document.body.classList.add(fontSize);
    const select = document.getElementById('font-size-select');
    if (select) select.value = fontSize;
  }
  
  // High readability
  const highReadability = localStorage.getItem('mf-high-readability') === 'true';
  if (highReadability) {
    document.body.classList.add('high-readability');
    const checkbox = document.getElementById('high-readability');
    if (checkbox) checkbox.checked = true;
  }
  
  // Dyslexia font
  const dyslexiaFont = localStorage.getItem('mf-dyslexia-font') === 'true';
  if (dyslexiaFont) {
    document.body.classList.add('dyslexia-friendly');
    const checkbox = document.getElementById('dyslexia-font');
    if (checkbox) checkbox.checked = true;
  }
  
  // Reduced motion
  const reduceMotion = localStorage.getItem('mf-reduce-motion') === 'true';
  if (reduceMotion) {
    toggleReduceMotion(true);
    const checkbox = document.getElementById('reduce-motion');
    if (checkbox) checkbox.checked = true;
  }
}

// Keyboard navigation for accessibility panel
document.addEventListener('keydown', (e) => {
  const panel = document.getElementById('accessibility-panel');
  if (!panel) return;
  
  // Close on Escape
  if (e.key === 'Escape' && panel.getAttribute('aria-hidden') === 'false') {
    closeAccessibilityPanel();
  }
  
  // Open with keyboard shortcut (Alt + A)
  if (e.altKey && e.key === 'a') {
    e.preventDefault();
    openAccessibilityPanel();
  }
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  loadAccessibilityPreferences();
});

// Export functions for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    openAccessibilityPanel,
    closeAccessibilityPanel,
    changeFontSize,
    toggleHighReadability,
    toggleDyslexiaFont,
    toggleReduceMotion
  };
}
