import { Howl, Howler } from "howler";

/**
 * Comprehensive audio management system for the Survive Until Sunrise game
 * Handles ambient sounds, sound effects, voice synthesis, and dynamic audio mixing
 */
class AudioManager {
  constructor() {
    this.ambientSounds = new Map();
    this.effectSounds = new Map();
    this.currentAmbient = null;
    this.masterVolume = 1.0;
    this.volumes = {
      master: 1.0,
      ambient: 0.3,
      effects: 0.7,
      voice: 0.9
    };
    this.isInitialized = false;
    this.loadingPromises = new Map();
    this.errorHandler = null;
    this.fadeIntervals = new Map();
    
    // Audio asset configuration
    this.audioAssets = {
      ambient: {
        forest_night: { 
          src: ['/sounds/forest-ambient.mp3', '/sounds/forest-ambient.ogg'], 
          loop: true, 
          volume: 0.3,
          fadeIn: 2000,
          fadeOut: 1000
        },
        house_creaks: { 
          src: ['/sounds/house-creaks.mp3', '/sounds/house-creaks.ogg'], 
          loop: true, 
          volume: 0.4,
          fadeIn: 1500,
          fadeOut: 1000
        },
        basement_drip: { 
          src: ['/sounds/basement-drip.mp3', '/sounds/basement-drip.ogg'], 
          loop: true, 
          volume: 0.2,
          fadeIn: 1000,
          fadeOut: 500
        },
        wind_howling: {
          src: ['/sounds/wind-howling.mp3', '/sounds/wind-howling.ogg'],
          loop: true,
          volume: 0.25,
          fadeIn: 3000,
          fadeOut: 2000
        }
      },
      effects: {
        footsteps: { 
          src: ['/sounds/footsteps.mp3', '/sounds/footsteps.ogg'], 
          volume: 0.6,
          sprite: {
            walk: [0, 1000],
            run: [1000, 800],
            sneak: [1800, 1200]
          }
        },
        door_creak: { 
          src: ['/sounds/door-creak.mp3', '/sounds/door-creak.ogg'], 
          volume: 0.7 
        },
        jump_scare: { 
          src: ['/sounds/jump-scare.mp3', '/sounds/jump-scare.ogg'], 
          volume: 1.0 
        },
        whisper: { 
          src: ['/sounds/whisper.mp3', '/sounds/whisper.ogg'], 
          volume: 0.5 
        },
        heartbeat: { 
          src: ['/sounds/heartbeat.mp3', '/sounds/heartbeat.ogg'], 
          volume: 0.8,
          loop: true
        },
        flashlight_click: {
          src: ['/sounds/flashlight-click.mp3', '/sounds/flashlight-click.ogg'],
          volume: 0.4
        },
        breathing_heavy: {
          src: ['/sounds/breathing-heavy.mp3', '/sounds/breathing-heavy.ogg'],
          volume: 0.6,
          loop: true
        },
        glass_break: {
          src: ['/sounds/glass-break.mp3', '/sounds/glass-break.ogg'],
          volume: 0.8
        }
      }
    };

    // Fallback audio assets (simple tones/silence for when files don't exist)
    this.fallbackAssets = {
      ambient: {
        silence: { src: ['data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT'] },
        forest_night: { src: ['data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT'] }
      },
      effects: {
        silence: { src: ['data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT'] }
      }
    };
  }

  /**
   * Initialize the audio manager and load all audio assets
   * @param {Function} errorHandler - Optional error handler function
   * @returns {Promise<boolean>} - Success status
   */
  async initialize(errorHandler = null) {
    if (this.isInitialized) {
      return true;
    }

    this.errorHandler = errorHandler;
    
    try {
      // Set global Howler settings
      Howler.volume(this.volumes.master);
      
      // Load all audio assets
      await this.loadAllSounds();
      
      this.isInitialized = true;
      console.log('AudioManager initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize AudioManager:', error);
      this.handleError('initialization', error);
      return false;
    }
  }

  /**
   * Load all audio assets with error handling and fallbacks
   * @returns {Promise<void>}
   */
  async loadAllSounds() {
    const loadPromises = [];

    // Load ambient sounds
    for (const [key, config] of Object.entries(this.audioAssets.ambient)) {
      loadPromises.push(this.loadSound('ambient', key, config));
    }

    // Load effect sounds
    for (const [key, config] of Object.entries(this.audioAssets.effects)) {
      loadPromises.push(this.loadSound('effects', key, config));
    }

    // Wait for all sounds to load (or fail gracefully)
    await Promise.allSettled(loadPromises);
  }

  /**
   * Load a single sound with fallback handling
   * @param {string} category - 'ambient' or 'effects'
   * @param {string} key - Sound identifier
   * @param {Object} config - Sound configuration
   * @returns {Promise<Howl>}
   */
  async loadSound(category, key, config) {
    const loadKey = `${category}_${key}`;
    
    if (this.loadingPromises.has(loadKey)) {
      return this.loadingPromises.get(loadKey);
    }

    const promise = new Promise((resolve, reject) => {
      const howlConfig = {
        ...config,
        onload: () => {
          console.log(`Loaded ${category} sound: ${key}`);
          resolve(sound);
        },
        onloaderror: (id, error) => {
          console.warn(`Failed to load ${category} sound: ${key}, using fallback`);
          this.loadFallbackSound(category, key).then(resolve).catch(reject);
        },
        onplayerror: (id, error) => {
          console.warn(`Playback error for ${category} sound: ${key}`);
          this.handleError('playback', error, { category, key });
        }
      };

      const sound = new Howl(howlConfig);
      
      if (category === 'ambient') {
        this.ambientSounds.set(key, sound);
      } else {
        this.effectSounds.set(key, sound);
      }
    });

    this.loadingPromises.set(loadKey, promise);
    return promise;
  }

  /**
   * Load fallback sound when primary sound fails
   * @param {string} category - 'ambient' or 'effects'
   * @param {string} key - Sound identifier
   * @returns {Promise<Howl>}
   */
  async loadFallbackSound(category, key) {
    const fallbackKey = this.fallbackAssets[category][key] ? key : 'silence';
    const fallbackConfig = this.fallbackAssets[category][fallbackKey] || this.fallbackAssets[category]['silence'];
    
    return new Promise((resolve) => {
      const sound = new Howl({
        ...fallbackConfig,
        onload: () => resolve(sound),
        onloaderror: () => {
          // Create a silent sound as last resort
          const silentSound = new Howl({
            src: ['data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT'],
            volume: 0
          });
          resolve(silentSound);
        }
      });
    });
  }

  /**
   * Play ambient sound with fade-in and layering support
   * @param {string} soundKey - Ambient sound identifier
   * @param {Object} options - Playback options
   * @returns {boolean} - Success status
   */
  playAmbient(soundKey, options = {}) {
    if (!this.isInitialized) {
      console.warn('AudioManager not initialized');
      return false;
    }

    const sound = this.ambientSounds.get(soundKey);
    if (!sound) {
      console.warn(`Ambient sound not found: ${soundKey}`);
      return false;
    }

    const {
      fadeIn = this.audioAssets.ambient[soundKey]?.fadeIn || 1000,
      volume = this.audioAssets.ambient[soundKey]?.volume || 0.3,
      replace = true
    } = options;

    try {
      // Stop current ambient if replacing
      if (replace && this.currentAmbient && this.currentAmbient !== soundKey) {
        this.stopAmbient();
      }

      // Set volume and play
      const finalVolume = volume * this.volumes.ambient * this.volumes.master;
      sound.volume(0);
      const soundId = sound.play();
      
      // Fade in
      sound.fade(0, finalVolume, fadeIn, soundId);
      
      this.currentAmbient = soundKey;
      return true;
    } catch (error) {
      this.handleError('ambient_playback', error, { soundKey });
      return false;
    }
  }

  /**
   * Stop ambient sound with fade-out
   * @param {Object} options - Stop options
   */
  stopAmbient(options = {}) {
    if (!this.currentAmbient) return;

    const sound = this.ambientSounds.get(this.currentAmbient);
    if (!sound) return;

    const { fadeOut = 1000 } = options;

    try {
      if (fadeOut > 0) {
        sound.fade(sound.volume(), 0, fadeOut);
        setTimeout(() => {
          sound.stop();
        }, fadeOut);
      } else {
        sound.stop();
      }
      
      this.currentAmbient = null;
    } catch (error) {
      this.handleError('ambient_stop', error);
    }
  }

  /**
   * Play sound effect with mixing support
   * @param {string} soundKey - Effect sound identifier
   * @param {Object} options - Playback options
   * @returns {number|null} - Sound ID or null if failed
   */
  playEffect(soundKey, options = {}) {
    if (!this.isInitialized) {
      console.warn('AudioManager not initialized');
      return null;
    }

    const sound = this.effectSounds.get(soundKey);
    if (!sound) {
      console.warn(`Effect sound not found: ${soundKey}`);
      return null;
    }

    const {
      volume = this.audioAssets.effects[soundKey]?.volume || 0.7,
      rate = 1.0,
      sprite = null,
      loop = false
    } = options;

    try {
      const finalVolume = volume * this.volumes.effects * this.volumes.master;
      sound.volume(finalVolume);
      sound.rate(rate);
      sound.loop(loop);
      
      const soundId = sprite ? sound.play(sprite) : sound.play();
      return soundId;
    } catch (error) {
      this.handleError('effect_playback', error, { soundKey });
      return null;
    }
  }

  /**
   * Stop a specific effect sound
   * @param {string} soundKey - Effect sound identifier
   * @param {number} soundId - Optional specific sound instance ID
   */
  stopEffect(soundKey, soundId = null) {
    const sound = this.effectSounds.get(soundKey);
    if (!sound) return;

    try {
      if (soundId) {
        sound.stop(soundId);
      } else {
        sound.stop();
      }
    } catch (error) {
      this.handleError('effect_stop', error, { soundKey });
    }
  }

  /**
   * Adjust volume for specific category or master volume
   * @param {string} category - 'master', 'ambient', 'effects', or 'voice'
   * @param {number} volume - Volume level (0-1)
   */
  adjustVolume(category, volume) {
    volume = Math.max(0, Math.min(1, volume));
    
    if (category === 'master') {
      this.volumes.master = volume;
      Howler.volume(volume);
    } else if (this.volumes.hasOwnProperty(category)) {
      this.volumes[category] = volume;
      
      // Update currently playing sounds
      if (category === 'ambient' && this.currentAmbient) {
        const sound = this.ambientSounds.get(this.currentAmbient);
        if (sound) {
          const baseVolume = this.audioAssets.ambient[this.currentAmbient]?.volume || 0.3;
          sound.volume(baseVolume * volume * this.volumes.master);
        }
      }
    }
  }

  /**
   * Get current volume for a category
   * @param {string} category - Volume category
   * @returns {number} - Current volume level
   */
  getVolume(category) {
    return this.volumes[category] || 0;
  }

  /**
   * Dynamically adjust audio based on game state with optimized horror atmosphere
   * @param {Object} gameState - Current game state
   */
  updateAudioForGameState(gameState) {
    if (!this.isInitialized || !gameState) return;

    const { fearLevel, health, currentTime, location } = gameState;

    // Enhanced fear-based audio mixing for optimal horror atmosphere
    const fearMultiplier = this.calculateOptimalFearMultiplier(fearLevel);
    this.adjustVolume('ambient', this.volumes.ambient * fearMultiplier);

    // Advanced heartbeat system with dynamic intensity
    this.updateHeartbeatAudio(fearLevel, health);

    // Breathing effects with smooth transitions
    this.updateBreathingAudio(health, fearLevel);

    // Dynamic ambient switching with crossfading
    this.updateAmbientForContext(currentTime, location, fearLevel);

    // Additional atmospheric effects based on combined state
    this.updateAtmosphericEffects(fearLevel, health, currentTime);
  }

  /**
   * Calculate optimal fear multiplier for horror atmosphere
   * @param {number} fearLevel - Current fear level (0-100)
   * @returns {number} - Optimized multiplier
   */
  calculateOptimalFearMultiplier(fearLevel) {
    // Non-linear curve for more dramatic audio changes
    const normalizedFear = fearLevel / 100;
    const curve = Math.pow(normalizedFear, 1.5); // Exponential curve
    return 0.4 + (curve * 0.8); // Range: 0.4 to 1.2
  }

  /**
   * Update heartbeat audio with dynamic intensity and layering
   * @param {number} fearLevel - Current fear level
   * @param {number} health - Current health level
   */
  updateHeartbeatAudio(fearLevel, health) {
    const heartbeatSound = this.effectSounds.get('heartbeat');
    const shouldPlayHeartbeat = fearLevel > 60 || health < 40;
    
    if (shouldPlayHeartbeat && heartbeatSound && !heartbeatSound.playing()) {
      // Calculate intensity based on both fear and health
      const fearIntensity = Math.max(0, (fearLevel - 60) / 40);
      const healthIntensity = Math.max(0, (40 - health) / 40);
      const combinedIntensity = Math.min(1, fearIntensity + healthIntensity * 0.5);
      
      const volume = 0.3 + (combinedIntensity * 0.5);
      const rate = 0.8 + (combinedIntensity * 0.4); // Faster when more intense
      
      this.playEffect('heartbeat', { 
        volume, 
        rate, 
        loop: true 
      });
    } else if (!shouldPlayHeartbeat && heartbeatSound?.playing()) {
      // Fade out heartbeat smoothly
      this.fadeOutEffect('heartbeat', 1000);
    } else if (heartbeatSound?.playing()) {
      // Adjust existing heartbeat intensity
      const fearIntensity = Math.max(0, (fearLevel - 60) / 40);
      const healthIntensity = Math.max(0, (40 - health) / 40);
      const combinedIntensity = Math.min(1, fearIntensity + healthIntensity * 0.5);
      
      const volume = (0.3 + (combinedIntensity * 0.5)) * this.volumes.effects * this.volumes.master;
      heartbeatSound.volume(volume);
    }
  }

  /**
   * Update breathing audio with smooth transitions
   * @param {number} health - Current health level
   * @param {number} fearLevel - Current fear level
   */
  updateBreathingAudio(health, fearLevel) {
    const breathingSound = this.effectSounds.get('breathing_heavy');
    const shouldPlayBreathing = health < 35 || fearLevel > 80;
    
    if (shouldPlayBreathing && breathingSound && !breathingSound.playing()) {
      const healthIntensity = Math.max(0, (35 - health) / 35);
      const fearIntensity = Math.max(0, (fearLevel - 80) / 20);
      const combinedIntensity = Math.min(1, healthIntensity + fearIntensity * 0.3);
      
      const volume = 0.2 + (combinedIntensity * 0.4);
      
      this.playEffect('breathing_heavy', { 
        volume, 
        loop: true 
      });
    } else if (!shouldPlayBreathing && breathingSound?.playing()) {
      this.fadeOutEffect('breathing_heavy', 1500);
    }
  }

  /**
   * Update atmospheric effects based on combined game state
   * @param {number} fearLevel - Current fear level
   * @param {number} health - Current health level
   * @param {string} currentTime - Current game time
   */
  updateAtmosphericEffects(fearLevel, health, currentTime) {
    const hour = parseInt(currentTime.split(':')[0]);
    
    // Critical state audio effects
    if (fearLevel > 90 && health < 20) {
      // Play distorted whispers at critical state
      if (Math.random() < 0.1) { // 10% chance per update
        this.playEffect('whisper', { 
          volume: 0.3, 
          rate: 0.7 // Slower, more menacing
        });
      }
    }
    
    // Time-based atmospheric enhancements
    if (hour === 3 && fearLevel > 50) {
      // Witching hour intensification
      this.adjustVolume('ambient', Math.min(1.0, this.volumes.ambient * 1.3));
    }
    
    // Dawn approach relief
    if (hour >= 5) {
      const dawnRelief = (hour - 5) * 0.2; // Gradual relief
      this.adjustVolume('ambient', Math.max(0.3, this.volumes.ambient * (1 - dawnRelief)));
    }
  }

  /**
   * Fade out effect sound smoothly
   * @param {string} soundKey - Effect sound key
   * @param {number} duration - Fade duration in ms
   */
  fadeOutEffect(soundKey, duration = 1000) {
    const sound = this.effectSounds.get(soundKey);
    if (!sound || !sound.playing()) return;
    
    const currentVolume = sound.volume();
    sound.fade(currentVolume, 0, duration);
    
    setTimeout(() => {
      sound.stop();
    }, duration);
  }

  /**
   * Update ambient sound based on time, location, and fear level with smooth crossfading
   * @param {string} currentTime - Current game time
   * @param {string} location - Current location
   * @param {number} fearLevel - Current fear level for dynamic selection
   */
  updateAmbientForContext(currentTime, location, fearLevel = 0) {
    let targetAmbient = this.selectOptimalAmbient(currentTime, location, fearLevel);

    // Smooth crossfading between ambient sounds
    if (this.currentAmbient !== targetAmbient) {
      this.crossfadeAmbient(targetAmbient, {
        fadeOutDuration: 1500,
        fadeInDuration: 2000,
        overlap: 500 // Overlap period for smoother transition
      });
    }
  }

  /**
   * Select optimal ambient sound based on multiple factors
   * @param {string} currentTime - Current game time
   * @param {string} location - Current location
   * @param {number} fearLevel - Current fear level
   * @returns {string} - Selected ambient sound key
   */
  selectOptimalAmbient(currentTime, location, fearLevel) {
    const hour = parseInt(currentTime.split(':')[0]);
    
    // Location-based primary selection
    let baseAmbient = 'forest_night';
    if (location === 'basement') {
      baseAmbient = 'basement_drip';
    } else if (location === 'house' || location === 'indoors') {
      baseAmbient = 'house_creaks';
    }
    
    // Time-based modifications
    if (hour >= 2 && hour < 4) {
      // Witching hours - more intense ambient
      if (fearLevel > 60) {
        baseAmbient = 'wind_howling';
      }
    } else if (hour >= 4 && hour < 6) {
      // Pre-dawn - slightly calmer
      if (location === 'outdoors' || !location) {
        baseAmbient = 'forest_night';
      }
    }
    
    // Fear-based overrides
    if (fearLevel > 80 && baseAmbient === 'forest_night') {
      baseAmbient = 'wind_howling'; // More intense for high fear
    }
    
    return baseAmbient;
  }

  /**
   * Crossfade between ambient sounds for smooth transitions
   * @param {string} newAmbient - Target ambient sound
   * @param {Object} options - Crossfade options
   */
  crossfadeAmbient(newAmbient, options = {}) {
    const {
      fadeOutDuration = 1500,
      fadeInDuration = 2000,
      overlap = 500
    } = options;

    const oldAmbient = this.currentAmbient;
    const oldSound = oldAmbient ? this.ambientSounds.get(oldAmbient) : null;
    const newSound = this.ambientSounds.get(newAmbient);

    if (!newSound) {
      console.warn(`Ambient sound not found: ${newAmbient}`);
      return;
    }

    // Start new ambient at low volume
    const targetVolume = (this.audioAssets.ambient[newAmbient]?.volume || 0.3) 
                        * this.volumes.ambient * this.volumes.master;
    
    newSound.volume(0);
    const newSoundId = newSound.play();
    
    // Fade in new ambient
    newSound.fade(0, targetVolume, fadeInDuration, newSoundId);
    this.currentAmbient = newAmbient;

    // Fade out old ambient with overlap
    if (oldSound && oldSound.playing()) {
      const fadeOutDelay = Math.max(0, overlap);
      setTimeout(() => {
        const currentOldVolume = oldSound.volume();
        oldSound.fade(currentOldVolume, 0, fadeOutDuration);
        
        setTimeout(() => {
          oldSound.stop();
        }, fadeOutDuration);
      }, fadeOutDelay);
    }
  }

  /**
   * Create audio mixing for simultaneous effects
   * @param {Array} effects - Array of effect configurations
   */
  playMixedEffects(effects) {
    const playedSounds = [];
    
    effects.forEach(({ soundKey, options = {}, delay = 0 }) => {
      if (delay > 0) {
        setTimeout(() => {
          const soundId = this.playEffect(soundKey, options);
          if (soundId) playedSounds.push({ soundKey, soundId });
        }, delay);
      } else {
        const soundId = this.playEffect(soundKey, options);
        if (soundId) playedSounds.push({ soundKey, soundId });
      }
    });

    return playedSounds;
  }

  /**
   * Handle audio errors with fallback strategies
   * @param {string} errorType - Type of error
   * @param {Error} error - Error object
   * @param {Object} context - Additional context
   */
  handleError(errorType, error, context = {}) {
    console.error(`AudioManager ${errorType} error:`, error, context);
    
    if (this.errorHandler) {
      this.errorHandler(errorType, error, context);
    }

    // Implement fallback strategies
    switch (errorType) {
      case 'initialization':
        // Continue with limited functionality
        this.isInitialized = true;
        break;
      case 'ambient_playback':
        // Try fallback ambient
        if (context.soundKey !== 'forest_night') {
          this.playAmbient('forest_night');
        }
        break;
      case 'effect_playback':
        // Log and continue - effects are not critical
        break;
    }
  }

  /**
   * Preload specific sounds for better performance
   * @param {Array} soundKeys - Array of sound keys to preload
   * @returns {Promise<void>}
   */
  async preloadSounds(soundKeys) {
    const preloadPromises = soundKeys.map(key => {
      // Check both ambient and effects
      if (this.audioAssets.ambient[key]) {
        return this.loadSound('ambient', key, this.audioAssets.ambient[key]);
      } else if (this.audioAssets.effects[key]) {
        return this.loadSound('effects', key, this.audioAssets.effects[key]);
      }
      return Promise.resolve();
    });

    await Promise.allSettled(preloadPromises);
  }

  /**
   * Get audio manager status and statistics
   * @returns {Object} - Status information
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      currentAmbient: this.currentAmbient,
      volumes: { ...this.volumes },
      loadedAmbientSounds: Array.from(this.ambientSounds.keys()),
      loadedEffectSounds: Array.from(this.effectSounds.keys()),
      totalSounds: this.ambientSounds.size + this.effectSounds.size
    };
  }

  /**
   * Clean up resources and stop all sounds
   */
  destroy() {
    // Stop all sounds
    this.stopAmbient({ fadeOut: 0 });
    
    this.effectSounds.forEach(sound => {
      try {
        sound.stop();
        sound.unload();
      } catch (error) {
        console.warn('Error unloading sound:', error);
      }
    });

    this.ambientSounds.forEach(sound => {
      try {
        sound.stop();
        sound.unload();
      } catch (error) {
        console.warn('Error unloading sound:', error);
      }
    });

    // Clear all maps and intervals
    this.ambientSounds.clear();
    this.effectSounds.clear();
    this.loadingPromises.clear();
    this.fadeIntervals.forEach(interval => clearInterval(interval));
    this.fadeIntervals.clear();

    this.isInitialized = false;
    this.currentAmbient = null;
  }
}

export default AudioManager;