"use client";

/**
 * VoiceNarrator - Advanced voice narration system for game feedback and storytelling
 * 
 * Features:
 * - Dynamic narration based on game state and player actions
 * - Queuing system to prevent overlapping speech
 * - Contextual responses with emotional tone adaptation
 * - Voice settings optimization for horror atmosphere
 * - Error handling and fallback mechanisms
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
 */
export class VoiceNarrator {
  constructor(options = {}) {
    // Voice synthesis configuration
    this.synthesis = typeof window !== 'undefined' ? window.speechSynthesis : null;
    this.isSupported = !!this.synthesis;
    
    // Voice settings optimized for horror atmosphere
    this.voiceSettings = {
      rate: options.rate || 0.8,           // Slower for dramatic effect
      pitch: options.pitch || 0.9,         // Slightly lower pitch
      volume: options.volume || 0.9,       // High volume for clarity
      lang: options.lang || 'en-US'
    };
    
    // Narration queue management
    this.narrationQueue = [];
    this.isNarrating = false;
    this.currentUtterance = null;
    
    // Voice selection
    this.preferredVoice = null;
    this.voiceLoadAttempts = 0;
    this.maxVoiceLoadAttempts = 10;
    
    // Contextual response templates
    this.responseTemplates = this.initializeResponseTemplates();
    
    // Event listeners
    this.onNarrationStart = options.onNarrationStart || null;
    this.onNarrationEnd = options.onNarrationEnd || null;
    this.onNarrationError = options.onNarrationError || null;
    
    // Initialize voice selection
    this.initializeVoice();
    
    console.log('VoiceNarrator initialized', {
      supported: this.isSupported,
      settings: this.voiceSettings
    });
  }

  /**
   * Initialize voice selection with preference for suitable voices
   */
  initializeVoice() {
    if (!this.isSupported) return;

    const loadVoices = () => {
      const voices = this.synthesis.getVoices();
      
      if (voices.length === 0 && this.voiceLoadAttempts < this.maxVoiceLoadAttempts) {
        this.voiceLoadAttempts++;
        setTimeout(loadVoices, 100);
        return;
      }

      // Prefer voices suitable for horror narration
      const preferredVoiceNames = [
        'Google UK English Male',
        'Microsoft David Desktop',
        'Alex',
        'Daniel',
        'Google US English'
      ];

      // Find the best available voice
      for (const voiceName of preferredVoiceNames) {
        const voice = voices.find(v => v.name.includes(voiceName));
        if (voice) {
          this.preferredVoice = voice;
          console.log('Selected voice:', voice.name);
          break;
        }
      }

      // Fallback to first English voice
      if (!this.preferredVoice) {
        this.preferredVoice = voices.find(v => v.lang.startsWith('en')) || voices[0];
        if (this.preferredVoice) {
          console.log('Fallback voice selected:', this.preferredVoice.name);
        }
      }
    };

    // Load voices immediately or wait for voiceschanged event
    if (this.synthesis.getVoices().length > 0) {
      loadVoices();
    } else {
      this.synthesis.addEventListener('voiceschanged', loadVoices);
    }
  }

  /**
   * Initialize response templates for different game contexts
   */
  initializeResponseTemplates() {
    return {
      // Game introduction and setup
      gameStart: [
        "Welcome to your nightmare. You must survive until sunrise at 6 AM.",
        "The darkness surrounds you. Your only hope is to make it through the night.",
        "Something evil lurks in the shadows. Stay quiet, stay hidden, stay alive."
      ],

      // Command acknowledgments
      commandSuccess: {
        hide: [
          "You crouch down in the shadows, heart pounding.",
          "You find a hiding spot and hold your breath.",
          "You press yourself against the wall, trying to become invisible."
        ],
        run: [
          "You sprint through the darkness, footsteps echoing behind you.",
          "You flee as fast as your legs can carry you.",
          "You run blindly through the night, terror driving you forward."
        ],
        open: [
          "The door creaks open with an ominous sound.",
          "You slowly push the door open, not knowing what awaits.",
          "The door swings open, revealing the unknown beyond."
        ],
        flashlight: [
          "Your flashlight cuts through the darkness, revealing... something.",
          "The beam of light pierces the shadows, but for how long?",
          "Light floods the area, but the battery won't last forever."
        ],
        listen: [
          "You strain your ears, listening for any sound in the darkness.",
          "You hold perfectly still, trying to hear what's out there.",
          "The silence is deafening, but something feels wrong."
        ]
      },

      // Command failures
      commandFailure: {
        hide: [
          "There's nowhere to hide here. You're completely exposed.",
          "You look around frantically, but find no place to conceal yourself.",
          "The area offers no shelter from whatever is hunting you."
        ],
        run: [
          "Your legs feel like lead. Fear has paralyzed you.",
          "You try to run but stumble in the darkness.",
          "Terror has frozen you in place. You cannot move."
        ],
        open: [
          "The door is locked tight. There's no way through.",
          "You push and pull, but the door won't budge.",
          "Something is blocking the door from the other side."
        ],
        flashlight: [
          "You reach for your flashlight, but the battery is dead.",
          "The flashlight flickers once and dies, leaving you in darkness.",
          "Your flashlight is nowhere to be found. The darkness consumes you."
        ]
      },

      // Fear level responses
      fearLevel: {
        low: [
          "You feel relatively calm, but stay alert.",
          "Your nerves are steady, but don't let your guard down.",
          "You're keeping it together, but the night is far from over."
        ],
        medium: [
          "Your heart is racing. Something doesn't feel right.",
          "Fear creeps into your mind. Every shadow seems to move.",
          "You're getting nervous. The darkness feels alive."
        ],
        high: [
          "Terror grips your soul. Your hands are shaking uncontrollably.",
          "Panic overwhelms you. Every sound makes you jump.",
          "You're on the verge of losing your mind. The fear is consuming you."
        ]
      },

      // Time progression
      timeUpdate: {
        "23:00": "11 PM. The night has just begun. Seven hours until dawn.",
        "00:00": "Midnight. The witching hour approaches. Six hours remain.",
        "01:00": "1 AM. The darkness deepens. Five hours until safety.",
        "02:00": "2 AM. The dead of night. Four hours to survive.",
        "03:00": "3 AM. The witching hour. Three hours until dawn.",
        "04:00": "4 AM. The darkest hour. Two hours left.",
        "05:00": "5 AM. Dawn approaches. One hour until sunrise.",
        "06:00": "6 AM. The sun rises. You have survived the night!"
      },

      // Random events
      events: {
        footsteps: [
          "You hear footsteps approaching from the darkness.",
          "Heavy footsteps echo through the silence.",
          "Something is walking towards you with deliberate steps."
        ],
        whispers: [
          "Whispers drift through the air, speaking words you cannot understand.",
          "Voices whisper your name from the shadows.",
          "The darkness speaks in hushed, menacing tones."
        ],
        doorSlam: [
          "A door slams shut somewhere in the distance.",
          "The sound of a slamming door echoes through the night.",
          "Something has just closed off your escape route."
        ],
        breathing: [
          "You hear heavy breathing that isn't your own.",
          "Something is breathing right behind you.",
          "The sound of labored breathing fills the air."
        ]
      },

      // Error messages
      errors: {
        commandNotRecognized: [
          "I didn't understand that. Try saying 'hide', 'run', 'open', or 'flashlight'.",
          "Speak clearly. Available commands are hide, run, open, flashlight, and listen.",
          "I couldn't make out your command. Try speaking more clearly."
        ],
        microphoneError: [
          "I can't hear you. Please check your microphone.",
          "There seems to be a problem with your microphone.",
          "Voice input is not working. Please check your audio settings."
        ]
      },

      // Victory and defeat
      gameEnd: {
        victory: [
          "Congratulations! You survived until sunrise. The nightmare is over.",
          "The first rays of dawn break through the darkness. You made it!",
          "As the sun rises, the evil retreats. You have conquered the night."
        ],
        defeat: [
          "The darkness has claimed you. Your survival ends here.",
          "You could not escape the horrors of the night.",
          "The evil has won. Your story ends in shadow."
        ]
      }
    };
  }

  /**
   * Add narration to the queue with priority and context
   */
  narrate(text, options = {}) {
    if (!this.isSupported) {
      console.warn('Speech synthesis not supported');
      return false;
    }

    const narrationItem = {
      text: text,
      priority: options.priority || 'normal', // 'high', 'normal', 'low'
      interrupt: options.interrupt || false,
      context: options.context || 'general',
      voiceSettings: { ...this.voiceSettings, ...options.voiceSettings },
      timestamp: Date.now()
    };

    // Handle interruption
    if (narrationItem.interrupt && this.isNarrating) {
      this.stopCurrentNarration();
    }

    // Add to queue based on priority
    if (narrationItem.priority === 'high') {
      this.narrationQueue.unshift(narrationItem);
    } else {
      this.narrationQueue.push(narrationItem);
    }

    // Start processing if not already narrating
    if (!this.isNarrating) {
      this.processNarrationQueue();
    }

    return true;
  }

  /**
   * Process the narration queue
   */
  processNarrationQueue() {
    if (this.narrationQueue.length === 0 || this.isNarrating) {
      return;
    }

    const narrationItem = this.narrationQueue.shift();
    this.speakText(narrationItem);
  }

  /**
   * Speak text using SpeechSynthesis API
   */
  speakText(narrationItem) {
    if (!this.isSupported) return;

    this.isNarrating = true;
    const SpeechSynthesisUtterance = typeof window !== 'undefined' ? window.SpeechSynthesisUtterance : null;
    if (!SpeechSynthesisUtterance) {
      this.isNarrating = false;
      return;
    }
    
    this.currentUtterance = new SpeechSynthesisUtterance(narrationItem.text);

    // Apply voice settings
    this.currentUtterance.rate = narrationItem.voiceSettings.rate;
    this.currentUtterance.pitch = narrationItem.voiceSettings.pitch;
    this.currentUtterance.volume = narrationItem.voiceSettings.volume;
    this.currentUtterance.lang = narrationItem.voiceSettings.lang;

    // Set preferred voice if available
    if (this.preferredVoice) {
      this.currentUtterance.voice = this.preferredVoice;
    }

    // Event handlers
    this.currentUtterance.onstart = () => {
      console.log('Narration started:', narrationItem.text);
      if (this.onNarrationStart) {
        this.onNarrationStart(narrationItem);
      }
    };

    this.currentUtterance.onend = () => {
      console.log('Narration ended');
      this.isNarrating = false;
      this.currentUtterance = null;
      
      if (this.onNarrationEnd) {
        this.onNarrationEnd(narrationItem);
      }

      // Process next item in queue
      setTimeout(() => this.processNarrationQueue(), 100);
    };

    this.currentUtterance.onerror = (event) => {
      console.error('Narration error:', event);
      this.isNarrating = false;
      this.currentUtterance = null;
      
      if (this.onNarrationError) {
        this.onNarrationError(event, narrationItem);
      }

      // Continue with next item after error
      setTimeout(() => this.processNarrationQueue(), 500);
    };

    // Speak the utterance
    try {
      this.synthesis.speak(this.currentUtterance);
    } catch (error) {
      console.error('Failed to speak:', error);
      this.isNarrating = false;
      this.currentUtterance = null;
    }
  }

  /**
   * Stop current narration
   */
  stopCurrentNarration() {
    if (this.synthesis && this.isNarrating) {
      this.synthesis.cancel();
      this.isNarrating = false;
      this.currentUtterance = null;
    }
  }

  /**
   * Clear narration queue
   */
  clearQueue() {
    this.narrationQueue = [];
    this.stopCurrentNarration();
  }

  /**
   * Provide contextual command feedback
   */
  provideCommandFeedback(command, success, gameState = {}) {
    let responseText = '';
    
    if (success) {
      const successResponses = this.responseTemplates.commandSuccess[command.action];
      if (successResponses) {
        responseText = this.getRandomResponse(successResponses);
      } else {
        responseText = `${command.action} command executed successfully.`;
      }
    } else {
      const failureResponses = this.responseTemplates.commandFailure[command.action];
      if (failureResponses) {
        responseText = this.getRandomResponse(failureResponses);
      } else {
        responseText = `Unable to ${command.action} right now.`;
      }
    }

    // Adjust voice settings based on fear level
    const voiceSettings = this.adjustVoiceForFear(gameState.fearLevel || 0);
    
    this.narrate(responseText, {
      priority: 'high',
      context: 'command-feedback',
      voiceSettings
    });
  }

  /**
   * Provide game event narration
   */
  narrateEvent(eventType, eventData = {}, gameState = {}) {
    const eventResponses = this.responseTemplates.events[eventType];
    let responseText = '';

    if (eventResponses) {
      responseText = this.getRandomResponse(eventResponses);
    } else if (eventData.narration) {
      responseText = eventData.narration;
    } else {
      responseText = `Something happens in the darkness.`;
    }

    // Adjust voice settings for dramatic effect
    const voiceSettings = this.adjustVoiceForEvent(eventType, gameState.fearLevel || 0);
    
    this.narrate(responseText, {
      priority: 'high',
      interrupt: eventData.urgent || false,
      context: 'event',
      voiceSettings
    });
  }

  /**
   * Provide fear level feedback
   */
  narrateFearLevel(fearLevel, previousLevel = 0) {
    if (Math.abs(fearLevel - previousLevel) < 20) {
      return; // Don't narrate small fear changes
    }

    let category = 'low';
    if (fearLevel >= 70) category = 'high';
    else if (fearLevel >= 40) category = 'medium';

    const responses = this.responseTemplates.fearLevel[category];
    const responseText = this.getRandomResponse(responses);

    const voiceSettings = this.adjustVoiceForFear(fearLevel);
    
    this.narrate(responseText, {
      priority: 'normal',
      context: 'fear-update',
      voiceSettings
    });
  }

  /**
   * Provide time progression updates
   */
  narrateTimeUpdate(currentTime, gameState = {}) {
    const timeResponse = this.responseTemplates.timeUpdate[currentTime];
    
    if (timeResponse) {
      const voiceSettings = this.adjustVoiceForTime(currentTime);
      
      this.narrate(timeResponse, {
        priority: 'normal',
        context: 'time-update',
        voiceSettings
      });
    }
  }

  /**
   * Handle game start narration
   */
  narrateGameStart() {
    const startResponses = this.responseTemplates.gameStart;
    const responseText = this.getRandomResponse(startResponses);
    
    this.narrate(responseText, {
      priority: 'high',
      context: 'game-start',
      voiceSettings: { ...this.voiceSettings, rate: 0.7 } // Slower for dramatic intro
    });
  }

  /**
   * Handle game end narration
   */
  narrateGameEnd(victory = false, cause = '') {
    const endType = victory ? 'victory' : 'defeat';
    const endResponses = this.responseTemplates.gameEnd[endType];
    const responseText = this.getRandomResponse(endResponses);
    
    const voiceSettings = victory 
      ? { ...this.voiceSettings, pitch: 1.1, rate: 0.9 } // Higher, faster for victory
      : { ...this.voiceSettings, pitch: 0.7, rate: 0.6 }; // Lower, slower for defeat
    
    this.narrate(responseText, {
      priority: 'high',
      interrupt: true,
      context: 'game-end',
      voiceSettings
    });
  }

  /**
   * Handle error narration
   */
  narrateError(errorType, errorMessage = '') {
    const errorResponses = this.responseTemplates.errors[errorType];
    let responseText = '';

    if (errorResponses) {
      responseText = this.getRandomResponse(errorResponses);
    } else if (errorMessage) {
      responseText = errorMessage;
    } else {
      responseText = "Something went wrong. Please try again.";
    }

    this.narrate(responseText, {
      priority: 'high',
      context: 'error',
      voiceSettings: { ...this.voiceSettings, rate: 0.9 }
    });
  }

  /**
   * Adjust voice settings based on fear level
   */
  adjustVoiceForFear(fearLevel) {
    const settings = { ...this.voiceSettings };
    
    if (fearLevel >= 70) {
      // High fear: faster, higher pitch, more urgent
      settings.rate = Math.min(1.2, settings.rate + 0.3);
      settings.pitch = Math.min(1.5, settings.pitch + 0.2);
    } else if (fearLevel >= 40) {
      // Medium fear: slightly faster and higher
      settings.rate = Math.min(1.0, settings.rate + 0.1);
      settings.pitch = Math.min(1.2, settings.pitch + 0.1);
    }
    // Low fear: use default settings
    
    return settings;
  }

  /**
   * Adjust voice settings based on event type
   */
  adjustVoiceForEvent(eventType, fearLevel) {
    const settings = this.adjustVoiceForFear(fearLevel);
    
    switch (eventType) {
      case 'whispers':
        settings.rate = 0.6;
        settings.pitch = 0.8;
        settings.volume = 0.7;
        break;
      case 'footsteps':
        settings.rate = 0.7;
        settings.pitch = 0.9;
        break;
      case 'doorSlam':
        settings.rate = 1.0;
        settings.pitch = 1.1;
        break;
      case 'breathing':
        settings.rate = 0.5;
        settings.pitch = 0.7;
        settings.volume = 0.8;
        break;
    }
    
    return settings;
  }

  /**
   * Adjust voice settings based on time of night
   */
  adjustVoiceForTime(currentTime) {
    const settings = { ...this.voiceSettings };
    
    // Make voice more urgent as dawn approaches
    const hour = parseInt(currentTime.split(':')[0]);
    
    if (hour >= 5) {
      // 5-6 AM: More hopeful, slightly faster
      settings.pitch = Math.min(1.2, settings.pitch + 0.2);
      settings.rate = Math.min(1.0, settings.rate + 0.1);
    } else if (hour >= 3) {
      // 3-4 AM: Darkest hour, slower and lower
      settings.pitch = Math.max(0.7, settings.pitch - 0.1);
      settings.rate = Math.max(0.6, settings.rate - 0.1);
    }
    
    return settings;
  }

  /**
   * Get random response from array
   */
  getRandomResponse(responses) {
    if (!Array.isArray(responses) || responses.length === 0) {
      return "Something happens in the darkness.";
    }
    
    return responses[Math.floor(Math.random() * responses.length)];
  }

  /**
   * Get current queue status
   */
  getQueueStatus() {
    return {
      isNarrating: this.isNarrating,
      queueLength: this.narrationQueue.length,
      currentText: this.currentUtterance ? this.currentUtterance.text : null,
      isSupported: this.isSupported
    };
  }

  /**
   * Update voice settings
   */
  updateVoiceSettings(newSettings) {
    this.voiceSettings = { ...this.voiceSettings, ...newSettings };
  }

  /**
   * Test voice synthesis
   */
  testVoice() {
    this.narrate("Voice narration system is working correctly.", {
      priority: 'high',
      context: 'test'
    });
  }
}

export default VoiceNarrator;