/**
 * CommandParser - Advanced voice command parsing with aliases and confidence scoring
 * Handles command recognition, validation, and error handling for voice input
 */

export class CommandParser {
  constructor() {
    // Command mapping with aliases and metadata
    this.commandMap = new Map([
      ['hide', { 
        action: 'hide', 
        aliases: ['duck', 'crouch', 'take cover', 'get down', 'cover'], 
        category: 'defensive',
        description: 'Hide from threats'
      }],
      ['run', { 
        action: 'run', 
        aliases: ['flee', 'escape', 'go', 'move', 'sprint', 'get away'], 
        category: 'movement',
        description: 'Run away from danger'
      }],
      ['open', { 
        action: 'open', 
        aliases: ['unlock', 'enter', 'go through', 'open door'], 
        category: 'interaction',
        description: 'Open doors or containers'
      }],
      ['close', { 
        action: 'close', 
        aliases: ['shut', 'lock', 'close door', 'shut door'], 
        category: 'interaction',
        description: 'Close doors or containers'
      }],
      ['flashlight', { 
        action: 'flashlight', 
        aliases: ['light', 'torch', 'turn on light', 'use flashlight', 'shine light'], 
        category: 'tool',
        description: 'Use flashlight'
      }],
      ['listen', { 
        action: 'listen', 
        aliases: ['hear', 'check', 'pay attention', 'focus'], 
        category: 'perception',
        description: 'Listen for sounds'
      }],
      ['look', { 
        action: 'look', 
        aliases: ['see', 'examine', 'inspect', 'search', 'check around'], 
        category: 'perception',
        description: 'Look around or examine something'
      }],
      ['wait', { 
        action: 'wait', 
        aliases: ['stay', 'remain', 'hold', 'pause', 'stay still'], 
        category: 'passive',
        description: 'Wait and do nothing'
      }],
      ['help', { 
        action: 'help', 
        aliases: ['commands', 'what can i do', 'instructions'], 
        category: 'meta',
        description: 'Get help with commands'
      }],
      ['use', {
        action: 'use',
        aliases: ['activate', 'turn on', 'employ', 'utilize'],
        category: 'inventory',
        description: 'Use an item from inventory'
      }],
      ['search', {
        action: 'search',
        aliases: ['look for', 'find', 'examine', 'investigate'],
        category: 'inventory',
        description: 'Search for items in the current location'
      }],
      ['inventory', {
        action: 'inventory',
        aliases: ['items', 'what do i have', 'check inventory', 'my items'],
        category: 'inventory',
        description: 'Check your current inventory'
      }],
      ['combine', {
        action: 'combine',
        aliases: ['mix', 'use with', 'put together'],
        category: 'inventory',
        description: 'Combine items together'
      }]
    ]);

    // Confidence scoring weights
    this.confidenceWeights = {
      exactMatch: 1.0,
      aliasMatch: 0.9,
      partialMatch: 0.7,
      contextMatch: 0.6,
      fuzzyMatch: 0.4
    };

    // Common filler words to ignore
    this.fillerWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 
      'of', 'with', 'by', 'please', 'can', 'could', 'would', 'should', 'i', 
      'want', 'need', 'try', 'let', 'me', 'now', 'then', 'here', 'there'
    ]);

    // Context-aware command modifiers
    this.contextModifiers = new Map([
      ['quickly', { urgency: 'high', fearModifier: 0.1 }],
      ['slowly', { urgency: 'low', fearModifier: -0.1 }],
      ['carefully', { urgency: 'low', fearModifier: -0.05 }],
      ['quietly', { stealth: true, fearModifier: -0.1 }],
      ['loudly', { stealth: false, fearModifier: 0.1 }]
    ]);
  }

  /**
   * Parse a voice command transcript into actionable command data
   * @param {string} transcript - Raw voice input transcript
   * @param {Object} gameContext - Current game state context for better parsing
   * @returns {Object} Parsed command with action, confidence, and metadata
   */
  parseCommand(transcript, gameContext = {}) {
    if (!transcript || typeof transcript !== 'string') {
      return this.createErrorResult('Invalid input', transcript);
    }

    const normalized = this.normalizeTranscript(transcript);
    const tokens = this.tokenizeCommand(normalized);
    
    // Try different parsing strategies in order of confidence
    const strategies = [
      () => this.parseExactMatch(tokens),
      () => this.parseAliasMatch(tokens),
      () => this.parsePartialMatch(tokens),
      () => this.parseContextualMatch(tokens, gameContext),
      () => this.parseFuzzyMatch(tokens)
    ];

    for (const strategy of strategies) {
      const result = strategy();
      if (result && result.confidence > 0.3) { // Minimum confidence threshold
        return this.enhanceResult(result, tokens, gameContext);
      }
    }

    // No valid command found
    return this.createErrorResult('Command not recognized', transcript);
  }

  /**
   * Normalize transcript for better parsing
   * @param {string} transcript - Raw transcript
   * @returns {string} Normalized transcript
   */
  normalizeTranscript(transcript) {
    return transcript
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' '); // Normalize whitespace
  }

  /**
   * Tokenize command into meaningful parts
   * @param {string} normalized - Normalized transcript
   * @returns {Array} Array of tokens
   */
  tokenizeCommand(normalized) {
    return normalized
      .split(' ')
      .filter(word => word.length > 0 && !this.fillerWords.has(word));
  }

  /**
   * Parse exact command matches
   * @param {Array} tokens - Command tokens
   * @returns {Object|null} Parse result or null
   */
  parseExactMatch(tokens) {
    const commandText = tokens.join(' ');
    
    for (const [command, config] of this.commandMap) {
      if (commandText === command) {
        return {
          action: config.action,
          confidence: this.confidenceWeights.exactMatch,
          matchType: 'exact',
          originalText: commandText,
          category: config.category
        };
      }
    }
    
    return null;
  }

  /**
   * Parse alias matches
   * @param {Array} tokens - Command tokens
   * @returns {Object|null} Parse result or null
   */
  parseAliasMatch(tokens) {
    const commandText = tokens.join(' ');
    
    for (const [command, config] of this.commandMap) {
      for (const alias of config.aliases) {
        if (commandText === alias) {
          return {
            action: config.action,
            confidence: this.confidenceWeights.aliasMatch,
            matchType: 'alias',
            matchedAlias: alias,
            originalText: commandText,
            category: config.category
          };
        } else if (commandText.includes(alias)) {
          return {
            action: config.action,
            confidence: this.confidenceWeights.partialMatch * 0.9,
            matchType: 'alias',
            matchedAlias: alias,
            originalText: commandText,
            category: config.category
          };
        }
      }
    }
    
    return null;
  }

  /**
   * Parse partial matches (command appears in transcript)
   * @param {Array} tokens - Command tokens
   * @returns {Object|null} Parse result or null
   */
  parsePartialMatch(tokens) {
    const commandText = tokens.join(' ');
    
    for (const [command, config] of this.commandMap) {
      if (tokens.includes(command)) {
        return {
          action: config.action,
          confidence: this.confidenceWeights.partialMatch,
          matchType: 'partial',
          originalText: commandText,
          category: config.category
        };
      }
      
      // Check if any alias appears in tokens
      for (const alias of config.aliases) {
        const aliasTokens = alias.split(' ');
        if (aliasTokens.length > 1 && aliasTokens.every(token => tokens.includes(token))) {
          return {
            action: config.action,
            confidence: this.confidenceWeights.partialMatch * 0.9,
            matchType: 'partial-alias',
            matchedAlias: alias,
            originalText: commandText,
            category: config.category
          };
        }
      }
    }
    
    return null;
  }

  /**
   * Parse contextual matches based on game state
   * @param {Array} tokens - Command tokens
   * @param {Object} gameContext - Current game context
   * @returns {Object|null} Parse result or null
   */
  parseContextualMatch(tokens, gameContext) {
    const commandText = tokens.join(' ');
    
    // Context-based command inference
    if (gameContext.fearLevel > 70) {
      // High fear - likely defensive commands
      if (tokens.some(token => ['behind', 'under', 'away'].includes(token))) {
        return {
          action: 'hide',
          confidence: this.confidenceWeights.contextMatch,
          matchType: 'contextual',
          originalText: commandText,
          category: 'defensive',
          contextReason: 'high fear level'
        };
      }
    }
    
    if (gameContext.location === 'dark_room' && tokens.some(token => ['see', 'bright', 'illuminate'].includes(token))) {
      return {
        action: 'flashlight',
        confidence: this.confidenceWeights.contextMatch,
        matchType: 'contextual',
        originalText: commandText,
        category: 'tool',
        contextReason: 'dark environment'
      };
    }
    
    return null;
  }

  /**
   * Parse fuzzy matches using similarity scoring
   * @param {Array} tokens - Command tokens
   * @returns {Object|null} Parse result or null
   */
  parseFuzzyMatch(tokens) {
    const commandText = tokens.join(' ');
    let bestMatch = null;
    let bestScore = 0;
    
    for (const [command, config] of this.commandMap) {
      // Check similarity with command
      let score = this.calculateSimilarity(commandText, command);
      
      // Check similarity with aliases
      for (const alias of config.aliases) {
        const aliasScore = this.calculateSimilarity(commandText, alias);
        score = Math.max(score, aliasScore * 0.9);
      }
      
      if (score > bestScore && score > 0.5) { // Increased threshold for better matches
        bestScore = score;
        bestMatch = {
          action: config.action,
          confidence: score * this.confidenceWeights.fuzzyMatch,
          matchType: 'fuzzy',
          originalText: commandText,
          category: config.category,
          similarity: score
        };
      }
    }
    
    return bestMatch;
  }

  /**
   * Calculate similarity between two strings using Levenshtein distance
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} Similarity score (0-1)
   */
  calculateSimilarity(str1, str2) {
    const maxLength = Math.max(str1.length, str2.length);
    if (maxLength === 0) return 1;
    
    const distance = this.levenshteinDistance(str1, str2);
    return (maxLength - distance) / maxLength;
  }

  /**
   * Calculate Levenshtein distance between two strings
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} Edit distance
   */
  levenshteinDistance(str1, str2) {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // deletion
          matrix[j - 1][i] + 1,     // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Enhance parse result with additional metadata
   * @param {Object} result - Base parse result
   * @param {Array} tokens - Original tokens
   * @param {Object} gameContext - Game context
   * @returns {Object} Enhanced result
   */
  enhanceResult(result, tokens, gameContext = {}) {
    // Extract modifiers
    const modifiers = this.extractModifiers(tokens);
    
    // Adjust confidence based on context
    if (gameContext && gameContext.fearLevel > 50 && result.category === 'defensive') {
      result.confidence = Math.min(1.1, result.confidence * 1.1);
    }
    
    // Add timing information
    result.timestamp = Date.now();
    result.processingTime = performance.now();
    
    // Add modifiers
    if (modifiers.length > 0) {
      result.modifiers = modifiers;
    }
    
    // Add validation status
    result.isValid = this.validateCommand(result, gameContext);
    
    return result;
  }

  /**
   * Extract command modifiers from tokens
   * @param {Array} tokens - Command tokens
   * @returns {Array} Array of modifier objects
   */
  extractModifiers(tokens) {
    const modifiers = [];
    
    for (const token of tokens) {
      if (this.contextModifiers.has(token)) {
        modifiers.push({
          type: token,
          ...this.contextModifiers.get(token)
        });
      }
    }
    
    return modifiers;
  }

  /**
   * Validate if command can be executed in current context
   * @param {Object} result - Parse result
   * @param {Object} gameContext - Game context
   * @returns {boolean} Whether command is valid
   */
  validateCommand(result, gameContext = {}) {
    // Check if player can perform actions
    if (gameContext && gameContext.fearLevel >= 90 && result.category !== 'passive' && result.category !== 'inventory') {
      result.validationError = 'Too scared to perform this action';
      return false;
    }
    
    // Check tool availability for legacy flashlight command
    if (result.action === 'flashlight') {
      const hasFlashlight = gameContext && gameContext.inventory && 
        gameContext.inventory.some(item => item.type === 'tool' && item.name.toLowerCase().includes('flashlight'));
      if (!hasFlashlight) {
        result.validationError = 'Flashlight not available';
        return false;
      }
    }
    
    // Validate inventory-specific commands
    if (result.category === 'inventory') {
      switch (result.action) {
        case 'use':
          // Generic use command - will be handled by InventorySystem
          break;
        case 'search':
          // Search is always valid
          break;
        case 'inventory':
          // Inventory check is always valid
          break;
        case 'combine':
          // Combination validation will be handled by InventorySystem
          break;
      }
    }
    
    // Check location-specific constraints
    if (result.action === 'open' && gameContext && gameContext.location === 'locked_room') {
      result.validationError = 'No doors available to open';
      return false;
    }
    
    return true;
  }

  /**
   * Create error result for failed parsing
   * @param {string} error - Error message
   * @param {string} originalText - Original input text
   * @returns {Object} Error result
   */
  createErrorResult(error, originalText) {
    return {
      action: 'unknown',
      confidence: 0,
      matchType: 'error',
      originalText: originalText || '',
      error: error,
      isValid: false,
      timestamp: Date.now()
    };
  }

  /**
   * Get all available commands with descriptions
   * @returns {Array} Array of command information
   */
  getAvailableCommands() {
    return Array.from(this.commandMap.entries()).map(([command, config]) => ({
      command: command,
      action: config.action,
      aliases: config.aliases,
      category: config.category,
      description: config.description
    }));
  }

  /**
   * Get commands by category
   * @param {string} category - Command category
   * @returns {Array} Array of commands in category
   */
  getCommandsByCategory(category) {
    return this.getAvailableCommands().filter(cmd => cmd.category === category);
  }

  /**
   * Calculate overall parsing statistics
   * @param {Array} parseResults - Array of previous parse results
   * @returns {Object} Statistics object
   */
  calculateStatistics(parseResults) {
    if (!parseResults || parseResults.length === 0) {
      return { totalCommands: 0, averageConfidence: 0, successRate: 0 };
    }

    const validResults = parseResults.filter(result => result.confidence > 0.3);
    const totalCommands = parseResults.length;
    const successfulCommands = validResults.length;
    const averageConfidence = validResults.reduce((sum, result) => sum + result.confidence, 0) / validResults.length || 0;

    return {
      totalCommands,
      successfulCommands,
      successRate: (successfulCommands / totalCommands) * 100,
      averageConfidence: averageConfidence * 100,
      commandsByType: this.groupResultsByType(validResults)
    };
  }

  /**
   * Group parse results by match type
   * @param {Array} results - Parse results
   * @returns {Object} Grouped results
   */
  groupResultsByType(results) {
    return results.reduce((groups, result) => {
      const type = result.matchType || 'unknown';
      groups[type] = (groups[type] || 0) + 1;
      return groups;
    }, {});
  }
}