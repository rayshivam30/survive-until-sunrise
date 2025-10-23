/**
 * EndingSystem - Manages multiple ending scenarios and game completion
 * Evaluates player actions, survival time, fear level, and choices to determine appropriate endings
 */

export class EndingSystem {
  constructor(gameState, audioManager = null, voiceNarrator = null) {
    this.gameState = gameState;
    this.audioManager = audioManager;
    this.voiceNarrator = voiceNarrator;
    
    // Ending tracking
    this.currentEnding = null;
    this.endingAchievements = this.loadAchievements();
    this.endingCallbacks = new Set();
    
    // Ending evaluation criteria
    this.endingCriteria = this.initializeEndingCriteria();
    
    // Bind methods
    this.evaluateEnding = this.evaluateEnding.bind(this);
    this.triggerEnding = this.triggerEnding.bind(this);
    this.restartGame = this.restartGame.bind(this);
  }

  /**
   * Initialize ending criteria and scenarios
   */
  initializeEndingCriteria() {
    return {
      // Victory endings (survived until sunrise)
      victory: {
        perfect_survivor: {
          type: 'victory',
          title: 'Perfect Survivor',
          description: 'Survived with minimal fear and full health',
          criteria: {
            survived: true,
            fearLevel: { max: 30 },
            health: { min: 80 },
            secretsFound: { min: 2 }
          },
          rarity: 'legendary'
        },
        brave_survivor: {
          type: 'victory',
          title: 'Brave Survivor',
          description: 'Survived despite high fear levels',
          criteria: {
            survived: true,
            fearLevel: { min: 70 },
            commandsUsed: { min: 15 }
          },
          rarity: 'rare'
        },
        lucky_survivor: {
          type: 'victory',
          title: 'Lucky Survivor',
          description: 'Barely survived with low health',
          criteria: {
            survived: true,
            health: { max: 25 },
            fearLevel: { min: 50 }
          },
          rarity: 'uncommon'
        },
        resourceful_survivor: {
          type: 'victory',
          title: 'Resourceful Survivor',
          description: 'Survived by using many items effectively',
          criteria: {
            survived: true,
            itemsUsed: { min: 5 },
            inventorySize: { min: 3 }
          },
          rarity: 'rare'
        },
        basic_survivor: {
          type: 'victory',
          title: 'Survivor',
          description: 'Made it through the night',
          criteria: {
            survived: true
          },
          rarity: 'common'
        }
      },
      
      // Death endings
      death: {
        fear_death: {
          type: 'death',
          title: 'Consumed by Terror',
          description: 'Overwhelmed by fear and panic',
          criteria: {
            survived: false,
            deathCause: 'fear',
            fearLevel: { min: 95 }
          },
          rarity: 'common'
        },
        health_death: {
          type: 'death',
          title: 'Succumbed to Injuries',
          description: 'Physical trauma proved too much',
          criteria: {
            survived: false,
            deathCause: 'health',
            health: { max: 0 }
          },
          rarity: 'common'
        },
        early_death: {
          type: 'death',
          title: 'Quick Demise',
          description: 'Died early in the night',
          criteria: {
            survived: false,
            survivalTime: { max: 2 } // Less than 2 hours
          },
          rarity: 'uncommon'
        },
        coward_death: {
          type: 'death',
          title: 'Paralyzed by Fear',
          description: 'Too scared to take any meaningful action',
          criteria: {
            survived: false,
            commandsUsed: { max: 5 },
            fearLevel: { min: 80 }
          },
          rarity: 'rare'
        },
        reckless_death: {
          type: 'death',
          title: 'Reckless Abandon',
          description: 'Bold actions led to a swift end',
          criteria: {
            survived: false,
            commandsUsed: { min: 20 },
            survivalTime: { max: 3 }
          },
          rarity: 'uncommon'
        }
      }
    };
  }

  /**
   * Evaluate and determine the appropriate ending based on game state
   * @returns {Object} Ending data
   */
  evaluateEnding() {
    const survived = this.gameState.isAlive && this.gameState.currentTime === "06:00";
    const endingType = survived ? 'victory' : 'death';
    const endings = this.endingCriteria[endingType];
    
    // Calculate game statistics for evaluation
    const stats = this.calculateGameStats();
    
    // Find the best matching ending
    let bestEnding = null;
    let bestScore = -1;
    
    for (const [endingId, ending] of Object.entries(endings)) {
      const score = this.evaluateEndingCriteria(ending.criteria, stats);
      if (score > bestScore) {
        bestScore = score;
        bestEnding = { id: endingId, ...ending, score };
      }
    }
    
    // Fallback to basic endings if no specific match
    if (!bestEnding) {
      const fallbackId = survived ? 'basic_survivor' : 'fear_death';
      bestEnding = { 
        id: fallbackId, 
        ...endings[fallbackId], 
        score: 0 
      };
    }
    
    return bestEnding;
  }

  /**
   * Calculate comprehensive game statistics for ending evaluation
   */
  calculateGameStats() {
    const survivalTimeHours = this.calculateSurvivalTime();
    const secretsFound = this.countSecretsFound();
    const itemsUsed = this.countItemsUsed();
    
    return {
      survived: this.gameState.isAlive && this.gameState.currentTime === "06:00",
      fearLevel: this.gameState.fearLevel,
      health: this.gameState.health,
      survivalTime: survivalTimeHours,
      commandsUsed: this.gameState.commandsIssued.length,
      inventorySize: this.gameState.inventory.length,
      secretsFound: secretsFound,
      itemsUsed: itemsUsed,
      deathCause: this.getDeathCause(),
      eventsTriggered: this.gameState.eventsTriggered.length,
      survivalScore: this.gameState.survivalScore || this.gameState.calculateSurvivalScore()
    };
  }

  /**
   * Calculate how long the player survived in game hours
   */
  calculateSurvivalTime() {
    if (!this.gameState.gameStartTime) return 0;
    
    // Convert real time to game time (1 real minute = 1 game hour)
    const realTimeElapsed = this.gameState.realTimeElapsed || 0;
    const gameHours = realTimeElapsed / (60 * 1000); // Convert ms to minutes (game hours)
    
    return Math.min(gameHours, 7); // Max 7 hours (11 PM to 6 AM)
  }

  /**
   * Count secrets/special items found
   */
  countSecretsFound() {
    const secretItems = ['hidden_key', 'secret_note', 'ancient_artifact', 'mysterious_photo'];
    return this.gameState.inventory.filter(item => 
      secretItems.includes(item.id) || item.type === 'secret'
    ).length;
  }

  /**
   * Count items that were actually used
   */
  countItemsUsed() {
    return this.gameState.inventory.filter(item => 
      item.durability < 100 || item.timesUsed > 0
    ).length;
  }

  /**
   * Determine the cause of death if player died
   */
  getDeathCause() {
    if (this.gameState.isAlive) return null;
    
    if (this.gameState.fearLevel >= 100) return 'fear';
    if (this.gameState.health <= 0) return 'health';
    return 'event'; // Death from specific event
  }

  /**
   * Evaluate how well game stats match ending criteria
   * @param {Object} criteria - Ending criteria to check
   * @param {Object} stats - Game statistics
   * @returns {number} Match score (higher is better)
   */
  evaluateEndingCriteria(criteria, stats) {
    let score = 0;
    let totalCriteria = 0;
    
    for (const [key, requirement] of Object.entries(criteria)) {
      if (!(key in stats)) continue;
      
      totalCriteria++;
      const statValue = stats[key];
      
      if (typeof requirement === 'boolean') {
        if (statValue === requirement) score += 10;
      } else if (typeof requirement === 'string') {
        if (statValue === requirement) score += 10;
      } else if (typeof requirement === 'object') {
        let criteriaMatch = true;
        
        if ('min' in requirement && statValue < requirement.min) {
          criteriaMatch = false;
        }
        if ('max' in requirement && statValue > requirement.max) {
          criteriaMatch = false;
        }
        if ('exact' in requirement && statValue !== requirement.exact) {
          criteriaMatch = false;
        }
        
        if (criteriaMatch) {
          score += 10;
          // Bonus points for exceeding minimums or being well within maximums
          if ('min' in requirement) {
            score += Math.min(5, (statValue - requirement.min) * 0.5);
          }
        }
      }
    }
    
    // Return normalized score
    return totalCriteria > 0 ? score / totalCriteria : 0;
  }

  /**
   * Trigger the ending sequence
   * @param {Object} ending - Ending data to trigger
   */
  async triggerEnding(ending = null) {
    if (!ending) {
      ending = this.evaluateEnding();
    }
    
    this.currentEnding = ending;
    
    // Record achievement
    this.recordAchievement(ending);
    
    // Generate ending content
    const endingContent = this.generateEndingContent(ending);
    
    // Play ending narration
    if (this.voiceNarrator) {
      await this.narrateEnding(endingContent);
    }
    
    // Play ending audio
    if (this.audioManager) {
      this.playEndingAudio(ending);
    }
    
    // Notify callbacks
    this.endingCallbacks.forEach(callback => {
      try {
        callback(ending, endingContent);
      } catch (error) {
        console.error('Error in ending callback:', error);
      }
    });
    
    console.log(`Ending triggered: ${ending.title} (${ending.type})`);
    
    return {
      ending,
      content: endingContent,
      canRestart: true,
      achievements: this.getAchievementSummary()
    };
  }

  /**
   * Generate detailed ending content including narration and visual elements
   */
  generateEndingContent(ending) {
    const stats = this.calculateGameStats();
    
    const content = {
      title: ending.title,
      description: ending.description,
      type: ending.type,
      rarity: ending.rarity,
      narration: this.generateEndingNarration(ending, stats),
      statistics: this.formatStatistics(stats),
      achievements: this.getRecentAchievements(),
      restartAvailable: true
    };
    
    return content;
  }

  /**
   * Generate contextual ending narration
   */
  generateEndingNarration(ending, stats) {
    const baseNarration = {
      perfect_survivor: `Incredible. You've survived the night with remarkable composure. Your fear never overwhelmed you, your health remained strong, and you discovered secrets others would never find. You are truly a master of survival. As the first rays of sunlight pierce through the darkness, you stand victorious - a perfect survivor.`,
      
      brave_survivor: `Despite the terror that gripped your heart, you pressed on. Your fear levels soared, but your courage never wavered. Through ${stats.commandsUsed} decisive actions, you fought through the horror and lived to see another day. The sunrise has never looked so beautiful.`,
      
      lucky_survivor: `By the skin of your teeth, you've made it through. With only ${stats.health} health remaining and fear coursing through your veins, luck was your greatest ally tonight. Sometimes survival isn't about skill - it's about refusing to give up when all seems lost.`,
      
      resourceful_survivor: `Your resourcefulness saved you. By cleverly using ${stats.itemsUsed} different items and maintaining an inventory of ${stats.inventorySize} tools, you turned the odds in your favor. Intelligence and preparation triumph over brute force once again.`,
      
      basic_survivor: `You survived. That's what matters. The night tested you, but you endured. As dawn breaks, you can finally breathe easy knowing you've conquered your fears and lived through the nightmare.`,
      
      fear_death: `The terror became too much to bear. Your mind, overwhelmed by fear reaching ${stats.fearLevel}%, simply couldn't cope anymore. In your final moments, the darkness consumed not just your surroundings, but your very soul. Sometimes, the greatest enemy is the fear within.`,
      
      health_death: `Your body gave out before your spirit did. The physical toll of the night proved too much, and despite your efforts, your health reached zero. You fought bravely, but sometimes courage isn't enough to overcome mortal limitations.`,
      
      early_death: `The night claimed you quickly. After only ${stats.survivalTime.toFixed(1)} hours, your journey came to an abrupt end. Perhaps rushing into danger wasn't the wisest choice, but at least your suffering was brief.`,
      
      coward_death: `Paralyzed by terror, you could barely act. With only ${stats.commandsUsed} attempts to save yourself and fear levels at ${stats.fearLevel}%, you became your own worst enemy. Sometimes inaction is the most dangerous action of all.`,
      
      reckless_death: `Your bold approach led to a swift demise. ${stats.commandsUsed} commands in just ${stats.survivalTime.toFixed(1)} hours - you threw caution to the wind and paid the ultimate price. Courage without wisdom is merely recklessness.`
    };
    
    return baseNarration[ending.id] || `Your journey ends here. ${ending.description}`;
  }

  /**
   * Format game statistics for display
   */
  formatStatistics(stats) {
    return {
      'Survival Time': `${stats.survivalTime.toFixed(1)} hours`,
      'Final Fear Level': `${stats.fearLevel.toFixed(0)}%`,
      'Final Health': `${stats.health.toFixed(0)}%`,
      'Commands Used': stats.commandsUsed,
      'Items Collected': stats.inventorySize,
      'Items Used': stats.itemsUsed,
      'Secrets Found': stats.secretsFound,
      'Events Survived': stats.eventsTriggered,
      'Survival Score': stats.survivalScore
    };
  }

  /**
   * Narrate the ending using voice synthesis
   */
  async narrateEnding(endingContent) {
    if (!this.voiceNarrator) return;
    
    try {
      // Stop any current narration
      this.voiceNarrator.stopCurrentNarration();
      
      // Narrate the ending
      await this.voiceNarrator.speak(endingContent.narration, {
        priority: 'high',
        rate: 0.8,
        pitch: 0.9
      });
      
      // Brief pause
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Narrate statistics if desired
      const statsNarration = `Your final statistics: ${endingContent.statistics['Survival Time']}, ${endingContent.statistics['Final Fear Level']} fear, ${endingContent.statistics['Final Health']} health remaining.`;
      
      await this.voiceNarrator.speak(statsNarration, {
        priority: 'medium',
        rate: 1.0
      });
      
    } catch (error) {
      console.error('Error narrating ending:', error);
    }
  }

  /**
   * Play appropriate ending audio
   */
  playEndingAudio(ending) {
    if (!this.audioManager) return;
    
    try {
      // Stop current ambient sounds
      this.audioManager.stopAmbient();
      
      // Play ending-specific audio
      const audioMap = {
        victory: 'victory_theme',
        death: 'death_theme'
      };
      
      const audioKey = audioMap[ending.type] || 'ending_theme';
      this.audioManager.playEffect(audioKey, { volume: 0.7 });
      
    } catch (error) {
      console.error('Error playing ending audio:', error);
    }
  }

  /**
   * Record achievement for this ending
   */
  recordAchievement(ending) {
    if (!this.endingAchievements[ending.id]) {
      this.endingAchievements[ending.id] = {
        id: ending.id,
        title: ending.title,
        description: ending.description,
        rarity: ending.rarity,
        firstAchieved: Date.now(),
        timesAchieved: 0
      };
    }
    
    this.endingAchievements[ending.id].timesAchieved++;
    this.endingAchievements[ending.id].lastAchieved = Date.now();
    
    // Save achievements
    this.saveAchievements();
  }

  /**
   * Get summary of all achievements
   */
  getAchievementSummary() {
    const total = Object.keys(this.endingCriteria.victory).length + Object.keys(this.endingCriteria.death).length;
    const achieved = Object.keys(this.endingAchievements).length;
    
    return {
      total,
      achieved,
      percentage: Math.round((achieved / total) * 100),
      recent: this.getRecentAchievements(),
      rarest: this.getRarestAchievement()
    };
  }

  /**
   * Get recently achieved endings
   */
  getRecentAchievements() {
    return Object.values(this.endingAchievements)
      .sort((a, b) => b.lastAchieved - a.lastAchieved)
      .slice(0, 3);
  }

  /**
   * Get the rarest achievement earned
   */
  getRarestAchievement() {
    const rarityOrder = { legendary: 4, rare: 3, uncommon: 2, common: 1 };
    
    return Object.values(this.endingAchievements)
      .sort((a, b) => rarityOrder[b.rarity] - rarityOrder[a.rarity])[0] || null;
  }

  /**
   * Restart the game
   */
  restartGame() {
    // Reset current ending
    this.currentEnding = null;
    
    // Notify callbacks about restart
    this.endingCallbacks.forEach(callback => {
      try {
        if (callback.onRestart) {
          callback.onRestart();
        }
      } catch (error) {
        console.error('Error in restart callback:', error);
      }
    });
    
    console.log('Game restart initiated');
    
    return {
      success: true,
      message: 'Game will restart shortly...'
    };
  }

  /**
   * Load achievements from localStorage
   */
  loadAchievements() {
    try {
      const saved = localStorage.getItem('survive-achievements');
      return saved ? JSON.parse(saved) : {};
    } catch (error) {
      console.error('Error loading achievements:', error);
      return {};
    }
  }

  /**
   * Save achievements to localStorage
   */
  saveAchievements() {
    try {
      localStorage.setItem('survive-achievements', JSON.stringify(this.endingAchievements));
    } catch (error) {
      console.error('Error saving achievements:', error);
    }
  }

  /**
   * Register callback for ending events
   * @param {Function} callback - Function to call when ending is triggered
   */
  onEnding(callback) {
    this.endingCallbacks.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.endingCallbacks.delete(callback);
    };
  }

  /**
   * Get current ending if one has been triggered
   */
  getCurrentEnding() {
    return this.currentEnding;
  }

  /**
   * Check if game should end based on current state
   */
  shouldTriggerEnding() {
    // Game ends if player dies or reaches sunrise
    return !this.gameState.isAlive || this.gameState.currentTime === "06:00";
  }

  /**
   * Get all possible endings for reference
   */
  getAllEndings() {
    return this.endingCriteria;
  }

  /**
   * Check if ending system is active
   * @returns {boolean} True if system is active
   */
  isActive() {
    return this.gameState && this.gameState.gameStarted;
  }

  /**
   * Get ending system statistics
   * @returns {Object} System statistics
   */
  getStats() {
    return {
      currentEnding: this.currentEnding?.id || null,
      totalAchievements: Object.keys(this.endingAchievements).length,
      achievementSummary: this.getAchievementSummary(),
      shouldTriggerEnding: this.shouldTriggerEnding()
    };
  }

  /**
   * Reset all achievements (for testing or fresh start)
   */
  resetAchievements() {
    this.endingAchievements = {};
    this.saveAchievements();
    console.log('All achievements reset');
  }
}