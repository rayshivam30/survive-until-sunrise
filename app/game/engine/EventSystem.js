/**
 * EventSystem - Random event generation and management system
 * Handles event generation based on time and fear level
 */

class EventSystem {
  constructor(gameState, audioManager, voiceController) {
    this.gameState = gameState;
    this.audioManager = audioManager;
    this.voiceController = voiceController;
    this.eventQueue = [];
    this.eventHistory = [];
    this.lastEventTime = null;
    this.eventCooldown = 30000; // 30 seconds minimum between events
    
    // Event configuration with probability-based triggers
    this.eventConfig = this.initializeEventConfig();
  }

  /**
   * Initialize event configuration with all possible events
   */
  initializeEventConfig() {
    return {
      ambient: [
        {
          id: 'distant_howl',
          type: 'ambient',
          trigger: {
            timeRange: ['23:00', '05:00'],
            fearThreshold: 0,
            probability: 0.3
          },
          content: {
            narration: 'A distant howl echoes through the darkness, sending chills down your spine.',
            audioFile: 'howl_distant',
            duration: 3000
          },
          consequences: {
            fearDelta: 15,
            healthDelta: 0
          }
        },
        {
          id: 'creaking_floorboards',
          type: 'ambient',
          trigger: {
            timeRange: ['23:30', '04:30'],
            fearThreshold: 20,
            probability: 0.4
          },
          content: {
            narration: 'The floorboards creak ominously above you. Something is moving up there.',
            audioFile: 'creaking_wood',
            duration: 4000
          },
          consequences: {
            fearDelta: 10,
            healthDelta: 0
          }
        },
        {
          id: 'whispers_in_walls',
          type: 'ambient',
          trigger: {
            timeRange: ['00:00', '03:00'],
            fearThreshold: 40,
            probability: 0.25
          },
          content: {
            narration: 'Faint whispers seem to emanate from within the walls themselves.',
            audioFile: 'whispers_faint',
            duration: 5000
          },
          consequences: {
            fearDelta: 20,
            healthDelta: 0
          }
        }
      ],
      threat: [
        {
          id: 'shadow_figure',
          type: 'threat',
          trigger: {
            timeRange: ['01:00', '04:00'],
            fearThreshold: 30,
            probability: 0.2
          },
          content: {
            narration: 'A dark figure moves in your peripheral vision. You need to decide quickly - hide or run?',
            audioFile: 'shadow_movement',
            duration: 6000
          },
          responses: [
            {
              command: 'hide',
              outcome: {
                fearDelta: -5,
                healthDelta: 0,
                narration: 'You quickly duck behind cover. The shadow passes by without noticing you.'
              }
            },
            {
              command: 'run',
              outcome: {
                fearDelta: 10,
                healthDelta: -10,
                narration: 'You bolt from your hiding spot. Something crashes behind you as you flee.'
              }
            }
          ],
          consequences: {
            timeout: {
              fearDelta: 25,
              healthDelta: -15,
              narration: 'Your hesitation costs you. The shadow figure draws closer.'
            }
          }
        },
        {
          id: 'door_rattling',
          type: 'threat',
          trigger: {
            timeRange: ['02:00', '05:00'],
            fearThreshold: 25,
            probability: 0.3
          },
          content: {
            narration: 'Something is violently rattling the door handle. Do you want to listen carefully or move away?',
            audioFile: 'door_rattle',
            duration: 4000
          },
          responses: [
            {
              command: 'listen',
              outcome: {
                fearDelta: 5,
                healthDelta: 0,
                narration: 'You hear heavy breathing on the other side. Whatever it is, it knows you are here.'
              }
            },
            {
              command: 'run',
              outcome: {
                fearDelta: -10,
                healthDelta: 0,
                narration: 'You quietly move away from the door. The rattling continues for a few more moments, then stops.'
              }
            }
          ],
          consequences: {
            timeout: {
              fearDelta: 20,
              healthDelta: 0,
              narration: 'The rattling stops abruptly. An eerie silence fills the air.'
            }
          }
        }
      ],
      discovery: [
        {
          id: 'find_flashlight',
          type: 'discovery',
          trigger: {
            timeRange: ['23:00', '02:00'],
            fearThreshold: 0,
            probability: 0.15
          },
          content: {
            narration: 'You notice something glinting in the corner. There appears to be a flashlight here.',
            audioFile: 'item_discovery',
            duration: 3000
          },
          responses: [
            {
              command: 'take',
              outcome: {
                fearDelta: -10,
                healthDelta: 0,
                narration: 'You pick up the flashlight. Its beam cuts through the darkness, making you feel safer.',
                itemGained: 'flashlight'
              }
            }
          ],
          consequences: {
            timeout: {
              fearDelta: 0,
              healthDelta: 0,
              narration: 'You decide to leave the flashlight where it is.'
            }
          }
        },
        {
          id: 'old_diary',
          type: 'discovery',
          trigger: {
            timeRange: ['00:30', '03:30'],
            fearThreshold: 15,
            probability: 0.1
          },
          content: {
            narration: 'An old diary lies open on a dusty table. The last entry mentions something about midnight visitors.',
            audioFile: 'paper_rustle',
            duration: 4000
          },
          consequences: {
            fearDelta: 5,
            healthDelta: 0
          }
        }
      ],
      choice: [
        {
          id: 'mysterious_phone',
          type: 'choice',
          trigger: {
            timeRange: ['01:30', '04:00'],
            fearThreshold: 35,
            probability: 0.1
          },
          content: {
            narration: 'An old rotary phone begins to ring. The sound is jarring in the silence. Do you answer it?',
            audioFile: 'phone_ring',
            duration: 8000
          },
          responses: [
            {
              command: 'answer',
              outcome: {
                fearDelta: 15,
                healthDelta: 0,
                narration: 'Heavy breathing fills the line, followed by a whispered warning: "They are coming for you."'
              }
            },
            {
              command: 'ignore',
              outcome: {
                fearDelta: 5,
                healthDelta: 0,
                narration: 'You let it ring. After what feels like an eternity, it finally stops.'
              }
            }
          ],
          consequences: {
            timeout: {
              fearDelta: 10,
              healthDelta: 0,
              narration: 'The phone stops ringing on its own, leaving an unsettling silence.'
            }
          }
        }
      ]
    };
  }

  /**
   * Generate a random event based on current game state
   */
  generateRandomEvent() {
    // Check cooldown
    if (this.lastEventTime && Date.now() - this.lastEventTime < this.eventCooldown) {
      return null;
    }

    const currentTime = this.gameState.currentTime;
    const fearLevel = this.gameState.fearLevel;
    
    // Collect all eligible events
    const eligibleEvents = [];
    
    Object.values(this.eventConfig).forEach(eventCategory => {
      eventCategory.forEach(event => {
        if (this.isEventEligible(event, currentTime, fearLevel)) {
          eligibleEvents.push(event);
        }
      });
    });

    if (eligibleEvents.length === 0) {
      return null;
    }

    // Select event based on probability weights
    const selectedEvent = this.selectEventByProbability(eligibleEvents);
    
    if (selectedEvent) {
      this.lastEventTime = Date.now();
      this.eventHistory.push({
        ...selectedEvent,
        triggeredAt: Date.now(),
        gameTime: currentTime,
        fearLevelAtTrigger: fearLevel
      });
    }

    return selectedEvent;
  }

  /**
   * Check if an event is eligible to trigger
   */
  isEventEligible(event, currentTime, fearLevel) {
    // Check if event was already triggered recently
    const recentHistory = this.eventHistory.filter(
      h => h.id === event.id && Date.now() - h.triggeredAt < 120000 // 2 minutes
    );
    if (recentHistory.length > 0) {
      return false;
    }

    // Check time range
    if (!this.isTimeInRange(currentTime, event.trigger.timeRange)) {
      return false;
    }

    // Check fear threshold
    if (fearLevel < event.trigger.fearThreshold) {
      return false;
    }

    return true;
  }

  /**
   * Check if current time is within event's time range
   */
  isTimeInRange(currentTime, timeRange) {
    const [startTime, endTime] = timeRange;
    const current = this.timeToMinutes(currentTime);
    const start = this.timeToMinutes(startTime);
    const end = this.timeToMinutes(endTime);

    // Handle overnight ranges (e.g., 23:00 to 05:00)
    if (start > end) {
      return current >= start || current <= end;
    }
    
    return current >= start && current <= end;
  }

  /**
   * Convert time string to minutes for comparison
   */
  timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Select event based on probability weights
   */
  selectEventByProbability(events) {
    // Calculate total probability weight
    const totalWeight = events.reduce((sum, event) => sum + event.trigger.probability, 0);
    
    // Generate random number
    const random = Math.random() * totalWeight;
    
    // Select event based on weighted probability
    let currentWeight = 0;
    for (const event of events) {
      currentWeight += event.trigger.probability;
      if (random <= currentWeight) {
        return event;
      }
    }
    
    return events[events.length - 1]; // Fallback to last event
  }

  /**
   * Process an event and trigger its effects
   */
  processEvent(event) {
    if (!event) return;

    // Add to event queue for processing
    this.eventQueue.push({
      ...event,
      startTime: Date.now(),
      processed: false,
      awaitingResponse: event.responses && event.responses.length > 0
    });

    // Play audio if available
    if (event.content.audioFile && this.audioManager) {
      this.audioManager.playEffect(event.content.audioFile);
    }

    // Provide narration
    if (event.content.narration && this.voiceController) {
      this.voiceController.speak(event.content.narration);
    }

    // Apply immediate consequences for ambient events
    if (event.type === 'ambient' || event.type === 'discovery') {
      this.applyEventConsequences(event.consequences);
    }

    return event;
  }

  /**
   * Evaluate player response to an event
   */
  evaluatePlayerResponse(command, event) {
    if (!event || !event.responses) {
      return null;
    }

    // Find matching response
    const response = event.responses.find(r => 
      command.toLowerCase().includes(r.command.toLowerCase())
    );

    if (response) {
      // Apply response outcome
      this.applyEventConsequences(response.outcome);
      
      // Provide feedback narration
      if (response.outcome.narration && this.voiceController) {
        this.voiceController.speak(response.outcome.narration);
      }

      // Handle item gains
      if (response.outcome.itemGained) {
        this.gameState.addToInventory(response.outcome.itemGained);
      }

      // Mark event as processed
      const queuedEvent = this.eventQueue.find(e => e.id === event.id && !e.processed);
      if (queuedEvent) {
        queuedEvent.processed = true;
        queuedEvent.awaitingResponse = false;
      }

      return response;
    }

    return null;
  }

  /**
   * Apply event consequences to game state
   */
  applyEventConsequences(consequences) {
    if (!consequences) return;

    if (consequences.fearDelta) {
      this.gameState.updateFear(consequences.fearDelta);
    }

    if (consequences.healthDelta) {
      this.gameState.updateHealth(consequences.healthDelta);
    }
  }

  /**
   * Handle event timeouts for events awaiting player response
   */
  handleEventTimeouts() {
    const now = Date.now();
    const timeoutDuration = 15000; // 15 seconds to respond

    this.eventQueue.forEach(event => {
      if (event.awaitingResponse && !event.processed) {
        if (now - event.startTime > timeoutDuration) {
          // Apply timeout consequences
          if (event.consequences && event.consequences.timeout) {
            this.applyEventConsequences(event.consequences.timeout);
            
            if (event.consequences.timeout.narration && this.voiceController) {
              this.voiceController.speak(event.consequences.timeout.narration);
            }
          }

          // Mark as processed
          event.processed = true;
          event.awaitingResponse = false;
        }
      }
    });

    // Clean up old processed events
    this.eventQueue = this.eventQueue.filter(event => 
      !event.processed || (now - event.startTime < 60000) // Keep for 1 minute for debugging
    );
  }

  /**
   * Get current active events awaiting response
   */
  getActiveEvents() {
    return this.eventQueue.filter(event => event.awaitingResponse && !event.processed);
  }

  /**
   * Get event history for analysis
   */
  getEventHistory() {
    return [...this.eventHistory];
  }

  /**
   * Clear event history (for game restart)
   */
  clearEventHistory() {
    this.eventHistory = [];
    this.eventQueue = [];
    this.lastEventTime = null;
  }

  /**
   * Set event frequency for performance optimization
   * @param {number} frequency - Event frequency multiplier (0.5 = half frequency, 1.0 = normal)
   */
  setEventFrequency(frequency) {
    this.eventFrequency = Math.max(0.1, Math.min(2.0, frequency));
    console.log(`EventSystem event frequency set to: ${this.eventFrequency}`);
  }

  /**
   * Check if event system is active
   * @returns {boolean} True if system is active
   */
  isActive() {
    return this.gameState && this.gameState.isAlive;
  }

  /**
   * Get event system statistics
   * @returns {Object} System statistics
   */
  getStats() {
    return {
      totalEventsTriggered: this.eventHistory.length,
      activeEvents: this.eventQueue.filter(e => e.awaitingResponse && !e.processed).length,
      queuedEvents: this.eventQueue.length,
      eventFrequency: this.eventFrequency || 1.0,
      lastEventTime: this.lastEventTime
    };
  }

  /**
   * Update event system (called from game loop)
   */
  update() {
    // Handle event timeouts
    this.handleEventTimeouts();

    // Randomly generate new events with frequency adjustment
    const baseChance = 0.1; // 10% base chance per update cycle
    const adjustedChance = baseChance * (this.eventFrequency || 1.0);
    
    if (Math.random() < adjustedChance) {
      const newEvent = this.generateRandomEvent();
      if (newEvent) {
        this.processEvent(newEvent);
      }
    }
  }
}

export default EventSystem;