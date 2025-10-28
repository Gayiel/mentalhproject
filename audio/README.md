# Audio Resources for MindFlow Sanctuary

## Calm Ambient Music

This directory is designed to hold calm, relaxing ambient music files for the mental health platform.

### Recommended Audio Files:

1. **calm-ambient.mp3** - Main ambient music track
2. **calm-ambient.ogg** - Alternative format for better browser support
3. **nature-sounds.wav** - Nature sounds for relaxation
4. **meditation-bells.wav** - Soft meditation bells

### Audio Requirements:

- **Format**: MP3, OGG, or WAV for best browser compatibility
- **Duration**: 3-10 minutes (will loop automatically)
- **Volume**: Moderate level (JavaScript will set to 30% volume)
- **Tone**: Calming, non-intrusive, mental health appropriate
- **BPM**: Slow tempo (60-80 BPM recommended for relaxation)

### Free Audio Resources:

1. **Freesound.org** - Community-driven sound library
2. **Zapsplat.com** - Professional sound effects (requires account)
3. **YouTube Audio Library** - Royalty-free music
4. **Incompetech.com** - Kevin MacLeod's royalty-free music
5. **Pixabay Music** - Free music for projects

### Usage:

The application will automatically try to load:
1. Online fallback sources (for demonstration)
2. Local files in this directory
3. Generate silent audio context if all fail

### Implementation Notes:

- Audio starts muted by default
- User controls volume via music toggle button
- Graceful fallback to silence if files not found
- Audio plays continuously while on main page
- Stops automatically when navigating to chat interface

---

**Important**: Ensure any audio files used comply with licensing requirements for your deployment environment.
