/**
 * VoiceErrorHandler - Centralized error handling for voice recognition
 * Provides fallback mechanisms and user-friendly error messages
 */

export class VoiceErrorHandler {
  constructor(options = {}) {
    this.options = {
      enableTextFallback: options.enableTextFallback ?? true,
      enableVisualFeedback: options.enableVisualFeedback ?? true,
      maxRetries: options.maxRetries ?? 3,
      retryDelay: options.retryDelay ?? 2000,
      ...options
    };
    
    this.retryCount = 0;
    this.lastError = null;
    this.errorHistory = [];
    this.fallbackActive = false;
    
    // Error message templates
    this.errorMessages = {
      'browser-support': {
        title: 'Voice Recognition Not Supported',
        message: 'Your browser doesn\'t support voice recognition. Please use a modern browser like Chrome, Firefox, or Safari.',
        fallback: 'You can still play using text commands.',
        severity: 'critical'
      },
      'permission-denied': {
        title: 'Microphone Permission Required',
        message: 'Please allow microphone access to use voice commands.',
        fallback: 'You can enable this in your browser settings or use text commands.',
        severity: 'critical'
      },
      'audio-capture': {
        title: 'Microphone Access Failed',
        message: 'Unable to access your microphone. Please check your microphone connection.',
        fallback: 'Try refreshing the page or use text commands.',
        severity: 'high'
      },
      'network': {
        title: 'Network Connection Issue',
        message: 'Voice recognition requires an internet connection.',
        fallback: 'Please check your connection. Retrying automatically...',
        severity: 'medium'
      },
      'service-denied': {
        title: 'Voice Service Unavailable',
        message: 'Voice recognition service is currently unavailable.',
        fallback: 'Please try again later or use text commands.',
        severity: 'high'
      },
      'no-match': {
        title: 'Command Not Recognized',
        message: 'I didn\'t understand that command. Try speaking more clearly.',
        fallback: 'Say "help" to see available commands.',
        severity: 'low'
      },
      'command-not-recognized': {
        title: 'Unknown Command',
        message: 'That command isn\'t recognized in the current context.',
        fallback: 'Try a different command or say "help" for options.',
        severity: 'low'
      },
      'start-failed': {
        title: 'Voice Recognition Failed to Start',
        message: 'Unable to start voice recognition.',
        fallback: 'Try refreshing the page or use text commands.',
        severity: 'high'
      },
      'unknown': {
        title: 'Voice Recognition Error',
        message: 'An unexpected error occurred with voice recognition.',
        fallback: 'Try again or use text commands.',
        severity: 'medium'
      }
    };
  }

  /**
   * Handle a voice recognition error
   * @param {Object} errorData - Error information
   * @param {Function} onFallback - Callback for fallback activation
   * @param {Function} onRetry - Callback for retry attempts
   * @returns {Object} Error handling result
   */
  handleError(errorData, onFallback = null, onRetry = null) {
    const { type, message, error, originalTranscript } = errorData;
    
    // Record error in history
    this.recordError(errorData);
    
    // Get error configuration
    const errorConfig = this.errorMessages[type] || this.errorMessages.unknown;
    
    // Determine if retry is appropriate
    const shouldRetry = this.shouldRetry(type);
    
    // Determine if fallback should be activated
    const shouldActivateFallback = this.shouldActivateFallback(type);
    
    // Create user-friendly error response
    const errorResponse = {
      type,
      severity: errorConfig.severity,
      title: errorConfig.title,
      message: this.personalizeMessage(errorConfig.message, errorData),
      fallbackMessage: errorConfig.fallback,
      canRetry: shouldRetry,
      shouldActivateFallback,
      retryCount: this.retryCount,
      timestamp: Date.now(),
      originalError: error,
      originalTranscript
    };

    // Handle retry logic
    if (shouldRetry && onRetry) {
      this.scheduleRetry(onRetry, type);
    }

    // Handle fallback activation
    if (shouldActivateFallback && onFallback && !this.fallbackActive) {
      this.activateFallback(onFallback, type);
    }

    // Log error for debugging
    this.logError(errorResponse);

    return errorResponse;
  }

  /**
   * Record error in history for analysis
   * @param {Object} errorData - Error data to record
   */
  recordError(errorData) {
    this.lastError = errorData;
    this.errorHistory.push({
      ...errorData,
      timestamp: Date.now(),
      retryCount: this.retryCount
    });

    // Keep only last 50 errors
    if (this.errorHistory.length > 50) {
      this.errorHistory.shift();
    }
  }

  /**
   * Determine if error should trigger a retry
   * @param {string} errorType - Type of error
   * @returns {boolean} Whether to retry
   */
  shouldRetry(errorType) {
    if (this.retryCount >= this.options.maxRetries) {
      return false;
    }

    const retryableErrors = ['network', 'start-failed', 'unknown'];
    return retryableErrors.includes(errorType);
  }

  /**
   * Determine if fallback should be activated
   * @param {string} errorType - Type of error
   * @returns {boolean} Whether to activate fallback
   */
  shouldActivateFallback(errorType) {
    const fallbackErrors = [
      'browser-support', 
      'permission-denied', 
      'audio-capture', 
      'service-denied'
    ];
    
    return fallbackErrors.includes(errorType) || 
           this.retryCount >= this.options.maxRetries;
  }

  /**
   * Schedule a retry attempt
   * @param {Function} onRetry - Retry callback
   * @param {string} errorType - Type of error that triggered retry
   */
  scheduleRetry(onRetry, errorType) {
    this.retryCount++;
    
    const delay = this.calculateRetryDelay(errorType);
    
    console.log(`Scheduling retry ${this.retryCount}/${this.options.maxRetries} in ${delay}ms`);
    
    setTimeout(() => {
      if (this.retryCount <= this.options.maxRetries) {
        console.log(`Attempting retry ${this.retryCount} for ${errorType}`);
        onRetry();
      }
    }, delay);
  }

  /**
   * Calculate retry delay based on error type and attempt count
   * @param {string} errorType - Type of error
   * @returns {number} Delay in milliseconds
   */
  calculateRetryDelay(errorType) {
    let baseDelay = this.options.retryDelay;
    
    // Exponential backoff for network errors
    if (errorType === 'network') {
      baseDelay = this.options.retryDelay * Math.pow(2, this.retryCount - 1);
    }
    
    // Add some jitter to prevent thundering herd
    const jitter = Math.random() * 1000;
    
    return Math.min(baseDelay + jitter, 10000); // Cap at 10 seconds
  }

  /**
   * Activate fallback mechanism
   * @param {Function} onFallback - Fallback callback
   * @param {string} errorType - Type of error that triggered fallback
   */
  activateFallback(onFallback, errorType) {
    if (this.fallbackActive) return;
    
    this.fallbackActive = true;
    console.log(`Activating fallback for ${errorType}`);
    
    // Determine fallback type
    let fallbackType = 'text-input';
    
    if (errorType === 'browser-support' || errorType === 'permission-denied') {
      fallbackType = 'text-only';
    } else if (errorType === 'audio-capture') {
      fallbackType = 'visual-feedback';
    }
    
    onFallback({
      type: fallbackType,
      reason: errorType,
      message: this.errorMessages[errorType]?.fallback || 'Fallback mode activated'
    });
  }

  /**
   * Personalize error message based on context
   * @param {string} template - Message template
   * @param {Object} errorData - Error context data
   * @returns {string} Personalized message
   */
  personalizeMessage(template, errorData) {
    let message = template;
    
    // Add context-specific information
    if (errorData.originalTranscript) {
      message += ` (You said: "${errorData.originalTranscript}")`;
    }
    
    if (this.retryCount > 0) {
      message += ` This is attempt ${this.retryCount + 1}.`;
    }
    
    return message;
  }

  /**
   * Log error for debugging and analytics
   * @param {Object} errorResponse - Processed error response
   */
  logError(errorResponse) {
    const logLevel = this.getLogLevel(errorResponse.severity);
    
    const logData = {
      type: errorResponse.type,
      severity: errorResponse.severity,
      message: errorResponse.message,
      retryCount: errorResponse.retryCount,
      timestamp: errorResponse.timestamp,
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    console[logLevel]('VoiceErrorHandler:', logData);
    
    // Send to analytics if configured
    if (this.options.analyticsCallback) {
      this.options.analyticsCallback(logData);
    }
  }

  /**
   * Get appropriate log level for error severity
   * @param {string} severity - Error severity
   * @returns {string} Console log level
   */
  getLogLevel(severity) {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'error';
      case 'medium': return 'warn';
      case 'low': return 'info';
      default: return 'log';
    }
  }

  /**
   * Reset error handler state
   */
  reset() {
    this.retryCount = 0;
    this.lastError = null;
    this.fallbackActive = false;
    console.log('VoiceErrorHandler reset');
  }

  /**
   * Get error statistics for debugging
   * @returns {Object} Error statistics
   */
  getErrorStatistics() {
    if (this.errorHistory.length === 0) {
      return {
        totalErrors: 0,
        errorsByType: {},
        errorsBySeverity: {},
        averageRetries: 0,
        fallbackActivations: 0
      };
    }

    const errorsByType = {};
    const errorsBySeverity = {};
    let totalRetries = 0;
    let fallbackActivations = 0;

    this.errorHistory.forEach(error => {
      // Count by type
      errorsByType[error.type] = (errorsByType[error.type] || 0) + 1;
      
      // Count by severity
      const severity = this.errorMessages[error.type]?.severity || 'unknown';
      errorsBySeverity[severity] = (errorsBySeverity[severity] || 0) + 1;
      
      // Sum retries
      totalRetries += error.retryCount || 0;
      
      // Count fallback activations
      if (this.shouldActivateFallback(error.type)) {
        fallbackActivations++;
      }
    });

    return {
      totalErrors: this.errorHistory.length,
      errorsByType,
      errorsBySeverity,
      averageRetries: totalRetries / this.errorHistory.length,
      fallbackActivations,
      lastError: this.lastError,
      fallbackActive: this.fallbackActive
    };
  }

  /**
   * Check if voice recognition is likely to work
   * @returns {Object} Compatibility check result
   */
  checkCompatibility() {
    const checks = {
      speechRecognition: !!(window.SpeechRecognition || window.webkitSpeechRecognition),
      mediaDevices: !!navigator.mediaDevices,
      getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
      https: window.location.protocol === 'https:' || window.location.hostname === 'localhost',
      modernBrowser: this.isModernBrowser()
    };

    const allPassed = Object.values(checks).every(check => check);
    
    const warnings = [];
    if (!checks.https) {
      warnings.push('HTTPS required for microphone access in production');
    }
    if (!checks.modernBrowser) {
      warnings.push('Browser may have limited voice recognition support');
    }

    return {
      compatible: allPassed,
      checks,
      warnings,
      recommendation: allPassed ? 
        'Voice recognition should work normally' : 
        'Consider enabling text input fallback'
    };
  }

  /**
   * Check if browser is modern enough for reliable voice recognition
   * @returns {boolean} Whether browser is modern
   */
  isModernBrowser() {
    const userAgent = navigator.userAgent;
    
    // Chrome 25+, Firefox 44+, Safari 14.1+, Edge 79+
    const modernBrowsers = [
      /Chrome\/([2-9][5-9]|[3-9][0-9]|\d{3,})/,
      /Firefox\/([4-9][4-9]|[5-9][0-9]|\d{3,})/,
      /Safari\/.*Version\/([1-9][4-9]|[2-9][0-9]|\d{3,})/,
      /Edg\/([7-9][9]|[8-9][0-9]|\d{3,})/
    ];

    return modernBrowsers.some(regex => regex.test(userAgent));
  }

  /**
   * Provide user-friendly troubleshooting suggestions
   * @param {string} errorType - Type of error
   * @returns {Array} Array of troubleshooting steps
   */
  getTroubleshootingSteps(errorType) {
    const commonSteps = [
      'Refresh the page and try again',
      'Check your internet connection',
      'Try using a different browser'
    ];

    const specificSteps = {
      'permission-denied': [
        'Click the microphone icon in your browser\'s address bar',
        'Select "Allow" for microphone access',
        'Refresh the page after granting permission'
      ],
      'audio-capture': [
        'Check that your microphone is connected and working',
        'Close other applications that might be using your microphone',
        'Try unplugging and reconnecting your microphone'
      ],
      'network': [
        'Check your internet connection',
        'Try switching to a different network',
        'Disable VPN if you\'re using one'
      ],
      'browser-support': [
        'Use a modern browser like Chrome, Firefox, or Safari',
        'Update your browser to the latest version',
        'Enable JavaScript if it\'s disabled'
      ]
    };

    return [
      ...(specificSteps[errorType] || []),
      ...commonSteps
    ];
  }
}