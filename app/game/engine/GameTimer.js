/**
 * GameTimer - Handles real-time to game-time conversion and time-based events
 * Implements 1 real minute = 1 game hour conversion (7 real minutes = 7 game hours)
 */

export class GameTimer {
  constructor(gameState) {
    this.gameState = gameState;
    
    // Time configuration
    this.REAL_TO_GAME_RATIO = 60; // 1 real minute = 60 game minutes (1 game hour)
    this.GAME_START_HOUR = 23; // 11:00 PM
    this.GAME_END_HOUR = 6; // 6:00 AM
    this.TOTAL_GAME_HOURS = 7; // 11 PM to 6 AM
    this.TOTAL_REAL_MINUTES = 7; // 7 real minutes for full game
    
    // Timer state
    this.startTime = null;
    this.pausedTime = 0;
    this.isPaused = false;
    this.isRunning = false;
    
    // Event callbacks
    this.timeUpdateCallbacks = new Set();
    this.hourChangeCallbacks = new Set();
    this.winConditionCallbacks = new Set();
    
    // Time-based event triggers
    this.timeBasedEvents = new Map();
    this.triggeredEvents = new Set();
    
    // Bind methods
    this.update = this.update.bind(this);
    this.start = this.start.bind(this);
    this.pause = this.pause.bind(this);
    this.resume = this.resume.bind(this);
    this.stop = this.stop.bind(this);
  }

  /**
   * Start the game timer
   */
  start() {
    if (this.isRunning) return;
    
    this.startTime = Date.now();
    this.pausedTime = 0;
    this.isRunning = true;
    this.isPaused = false;
    this.triggeredEvents.clear();
    
    // Initialize game state time
    this.gameState.currentTime = this.formatTime(this.GAME_START_HOUR, 0);
    this.gameState.gameStartTime = this.startTime;
    this.gameState.realTimeElapsed = 0;
    
    console.log('GameTimer started at', this.gameState.currentTime);
  }

  /**
   * Pause the timer
   */
  pause() {
    if (!this.isRunning || this.isPaused) return;
    
    this.isPaused = true;
    this.pausedTime = Date.now();
    console.log('GameTimer paused');
  }

  /**
   * Resume the timer
   */
  resume() {
    if (!this.isRunning || !this.isPaused) return;
    
    const pauseDuration = Date.now() - this.pausedTime;
    this.startTime += pauseDuration; // Adjust start time to account for pause
    this.isPaused = false;
    this.pausedTime = 0;
    console.log('GameTimer resumed');
  }

  /**
   * Stop the timer
   */
  stop() {
    this.isRunning = false;
    this.isPaused = false;
    this.startTime = null;
    this.pausedTime = 0;
    console.log('GameTimer stopped');
  }

  /**
   * Update timer and game time
   * @param {number} deltaTime - Time elapsed since last update in milliseconds
   */
  update(deltaTime) {
    if (!this.isRunning || this.isPaused) return;

    const currentRealTime = Date.now();
    const realTimeElapsed = currentRealTime - this.startTime;
    
    // Update game state
    this.gameState.realTimeElapsed = realTimeElapsed;
    
    // Calculate game time
    const gameTimeData = this.calculateGameTime(realTimeElapsed);
    const previousTime = this.gameState.currentTime;
    this.gameState.currentTime = gameTimeData.formattedTime;
    
    // Check for hour changes
    if (previousTime !== this.gameState.currentTime) {
      const previousHour = this.parseTime(previousTime).hour;
      const currentHour = gameTimeData.hour;
      
      if (previousHour !== currentHour) {
        this.notifyHourChange(currentHour, previousHour);
      }
      
      this.notifyTimeUpdate(gameTimeData);
    }
    
    // Check for time-based events
    this.checkTimeBasedEvents(gameTimeData);
    
    // Check win condition
    if (gameTimeData.hour === this.GAME_END_HOUR && gameTimeData.minute === 0) {
      this.notifyWinCondition();
    }
  }

  /**
   * Calculate current game time based on real time elapsed
   * @param {number} realTimeElapsed - Real time elapsed in milliseconds
   * @returns {Object} Game time data
   */
  calculateGameTime(realTimeElapsed) {
    // Convert real time to game time
    const realMinutesElapsed = realTimeElapsed / (1000 * 60);
    const gameMinutesElapsed = realMinutesElapsed * this.REAL_TO_GAME_RATIO;
    
    // Calculate current game hour and minute
    const totalGameMinutes = gameMinutesElapsed;
    const gameHoursElapsed = Math.floor(totalGameMinutes / 60);
    const gameMinutesInCurrentHour = Math.floor(totalGameMinutes % 60);
    
    // Calculate actual game time
    let currentGameHour = this.GAME_START_HOUR + gameHoursElapsed;
    
    // Handle day rollover (23:59 -> 00:00)
    if (currentGameHour >= 24) {
      currentGameHour = currentGameHour - 24;
    }
    
    const formattedTime = this.formatTime(currentGameHour, gameMinutesInCurrentHour);
    
    return {
      hour: currentGameHour,
      minute: gameMinutesInCurrentHour,
      formattedTime: formattedTime,
      totalGameMinutes: totalGameMinutes,
      realTimeElapsed: realTimeElapsed,
      gameProgress: Math.min(100, (realTimeElapsed / (this.TOTAL_REAL_MINUTES * 60 * 1000)) * 100)
    };
  }

  /**
   * Format time as HH:MM string
   * @param {number} hour - Hour (0-23)
   * @param {number} minute - Minute (0-59)
   * @returns {string} Formatted time string
   */
  formatTime(hour, minute) {
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  }

  /**
   * Parse time string into hour and minute
   * @param {string} timeString - Time string in HH:MM format
   * @returns {Object} Parsed time object
   */
  parseTime(timeString) {
    const [hourStr, minuteStr] = timeString.split(':');
    return {
      hour: parseInt(hourStr, 10),
      minute: parseInt(minuteStr, 10)
    };
  }

  /**
   * Get time remaining until sunrise
   * @returns {Object} Time remaining data
   */
  getTimeUntilSunrise() {
    if (!this.isRunning) {
      return { hours: 0, minutes: 0, totalMinutes: 0, percentage: 100 };
    }

    const currentTime = this.calculateGameTime(this.gameState.realTimeElapsed);
    const currentHour = currentTime.hour;
    const currentMinute = currentTime.minute;
    
    // Calculate minutes until 6:00 AM
    let hoursUntilSunrise;
    if (currentHour >= this.GAME_START_HOUR) {
      // Still in PM hours (23:xx)
      hoursUntilSunrise = (24 - currentHour) + this.GAME_END_HOUR;
    } else {
      // In AM hours (0:xx - 5:xx)
      hoursUntilSunrise = this.GAME_END_HOUR - currentHour;
    }
    
    const minutesUntilSunrise = (hoursUntilSunrise * 60) - currentMinute;
    const hoursDisplay = Math.floor(minutesUntilSunrise / 60);
    const minutesDisplay = minutesUntilSunrise % 60;
    
    // Calculate percentage of night completed
    const totalNightMinutes = this.TOTAL_GAME_HOURS * 60;
    const minutesElapsed = totalNightMinutes - minutesUntilSunrise;
    const percentage = Math.min(100, (minutesElapsed / totalNightMinutes) * 100);
    
    return {
      hours: hoursDisplay,
      minutes: minutesDisplay,
      totalMinutes: minutesUntilSunrise,
      percentage: percentage
    };
  }

  /**
   * Register a time-based event
   * @param {string} eventId - Unique event identifier
   * @param {string} triggerTime - Time to trigger event (HH:MM format)
   * @param {Function} callback - Function to call when event triggers
   */
  registerTimeBasedEvent(eventId, triggerTime, callback) {
    this.timeBasedEvents.set(eventId, {
      triggerTime: triggerTime,
      callback: callback,
      triggered: false
    });
  }

  /**
   * Unregister a time-based event
   * @param {string} eventId - Event identifier to remove
   */
  unregisterTimeBasedEvent(eventId) {
    this.timeBasedEvents.delete(eventId);
    this.triggeredEvents.delete(eventId);
  }

  /**
   * Check and trigger time-based events
   * @param {Object} gameTimeData - Current game time data
   */
  checkTimeBasedEvents(gameTimeData) {
    for (const [eventId, eventData] of this.timeBasedEvents) {
      if (this.triggeredEvents.has(eventId)) continue;
      
      const triggerTime = this.parseTime(eventData.triggerTime);
      
      if (gameTimeData.hour === triggerTime.hour && 
          gameTimeData.minute >= triggerTime.minute) {
        
        this.triggeredEvents.add(eventId);
        
        try {
          eventData.callback(gameTimeData);
          console.log(`Time-based event triggered: ${eventId} at ${gameTimeData.formattedTime}`);
        } catch (error) {
          console.error(`Error triggering time-based event ${eventId}:`, error);
        }
      }
    }
  }

  /**
   * Register callback for time updates
   * @param {Function} callback - Function to call on time updates
   * @returns {Function} Unsubscribe function
   */
  onTimeUpdate(callback) {
    this.timeUpdateCallbacks.add(callback);
    return () => this.timeUpdateCallbacks.delete(callback);
  }

  /**
   * Register callback for hour changes
   * @param {Function} callback - Function to call on hour changes
   * @returns {Function} Unsubscribe function
   */
  onHourChange(callback) {
    this.hourChangeCallbacks.add(callback);
    return () => this.hourChangeCallbacks.delete(callback);
  }

  /**
   * Register callback for win condition
   * @param {Function} callback - Function to call when win condition is met
   * @returns {Function} Unsubscribe function
   */
  onWinCondition(callback) {
    this.winConditionCallbacks.add(callback);
    return () => this.winConditionCallbacks.delete(callback);
  }

  /**
   * Notify time update callbacks
   * @param {Object} gameTimeData - Current game time data
   */
  notifyTimeUpdate(gameTimeData) {
    this.timeUpdateCallbacks.forEach(callback => {
      try {
        callback(gameTimeData);
      } catch (error) {
        console.error('Error in time update callback:', error);
      }
    });
  }

  /**
   * Notify hour change callbacks
   * @param {number} currentHour - Current hour
   * @param {number} previousHour - Previous hour
   */
  notifyHourChange(currentHour, previousHour) {
    this.hourChangeCallbacks.forEach(callback => {
      try {
        callback(currentHour, previousHour);
      } catch (error) {
        console.error('Error in hour change callback:', error);
      }
    });
  }

  /**
   * Notify win condition callbacks
   */
  notifyWinCondition() {
    this.winConditionCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Error in win condition callback:', error);
      }
    });
  }

  /**
   * Get current timer status
   * @returns {Object} Timer status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      currentTime: this.gameState.currentTime,
      realTimeElapsed: this.gameState.realTimeElapsed,
      gameProgress: this.calculateGameTime(this.gameState.realTimeElapsed || 0).gameProgress,
      timeUntilSunrise: this.getTimeUntilSunrise()
    };
  }

  /**
   * Reset timer to initial state
   */
  reset() {
    this.stop();
    this.triggeredEvents.clear();
    this.timeBasedEvents.clear();
    console.log('GameTimer reset');
  }
}