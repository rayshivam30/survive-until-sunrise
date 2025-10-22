# Sound Files

This directory contains audio assets for the Survive Until Sunrise game.

## Required Sound Files

The AudioManager expects the following sound files:

### Ambient Sounds
- `forest-ambient.mp3` / `forest-ambient.ogg` - Forest night ambience
- `house-creaks.mp3` / `house-creaks.ogg` - House creaking sounds
- `basement-drip.mp3` / `basement-drip.ogg` - Basement water dripping
- `wind-howling.mp3` / `wind-howling.ogg` - Wind howling sounds

### Effect Sounds
- `footsteps.mp3` / `footsteps.ogg` - Footstep sounds with sprites
- `door-creak.mp3` / `door-creak.ogg` - Door creaking sound
- `jump-scare.mp3` / `jump-scare.ogg` - Jump scare sound effect
- `whisper.mp3` / `whisper.ogg` - Whisper sound effect
- `heartbeat.mp3` / `heartbeat.ogg` - Heartbeat sound (loopable)
- `flashlight-click.mp3` / `flashlight-click.ogg` - Flashlight click sound
- `breathing-heavy.mp3` / `breathing-heavy.ogg` - Heavy breathing (loopable)
- `glass-break.mp3` / `glass-break.ogg` - Glass breaking sound

## Fallback System

The AudioManager includes a comprehensive fallback system:
1. If primary audio files fail to load, it attempts to load fallback versions
2. If fallback versions fail, it uses silent audio data URIs
3. If all audio fails, the game continues with visual effects as replacements

## Audio Format Support

The system supports multiple audio formats for better browser compatibility:
- MP3 (widely supported)
- OGG (open source alternative)
- WAV (uncompressed, larger files)

Files are loaded in order of preference, with the first successfully loaded format being used.