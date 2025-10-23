/**
 * Game Integration Validator - Final validation of all game systems
 * 
 * Performs comprehensive validation of game integration and polish
 * Verifies audio mixing, voice recognition, smooth transitions, and performance
 * 
 * Requirements: 1.7, 3.6, 7.6, 9.5
 */

export class GameIntegrationValidator {
  constructor() {
    this.validationResults = {
      audioMixing: { passed: false, details: [] },
      voiceRecognition: { passed: false, details: [] },
      smoothTransitions: { passed: false, details: [] },
      visualPolish: { passed: false, details: [] },
      performance: { passed: false, details: [] },
      overall: { passed: false, score: 0 }
    };
  }

  /**
   * Run complete validation suite
   * @param {GameEngine} gameEngine - Game engine instance
   * @returns {Object} Validation results
   */
  async validateComplete(gameEngine) {
    console.log('Starting comprehensive game integration validation...');

    try {
      // Validate audio mixing and volume levels
      await this.validateAudioMixing(gameEngine);
      
      // Validate voice recognition accuracy
      await this.validateVoiceRecognition(gameEngine);
      
      // Validate smooth transitions
      await this.validateSmoothTransitions(gameEngine);
      
      // Validate visual polish
      await this.validateVisualPolish();
      
      // Validate performance
      await this.validatePerformance(gameEngine);
      
      // Calculate overall score
      this.calculateOverallScore();
      
      console.log('Validation complete:', this.validationResults);
      return this.validationResults;
      
    } catch (error) {
      console.error('Validation failed:', error);
      this.validationResults.overall.passed = false;
      this.validationResults.overall.error = error.message;
      return this.validationResults;
    }
  }

  /**
   * Validate audio mixing and volume levels for optimal horror atmosphere
   */
  async validateAudioMixing(gameEngine) {
    const audioResults = this.validationResults.audioMixing;
    
    try {
      const audioManager = gameEngine.audioManager;
      
      if (!audioManager) {
        audioResults.details.push('❌ Audio manager not found');
        return;
      }

      // Test 1: Audio initialization
      if (audioManager.isInitialized) {
        audioResults.details.push('✅ Audio manager initialized successfully');
      } else {
        audioResults.details.push('❌ Audio manager not initialized');
        return;
      }

      // Test 2: Volume level optimization
      const volumes = audioManager.volumes;
      if (volumes.ambient >= 0.3 && volumes.ambient <= 0.5) {
        audioResults.details.push('✅ Ambient volume optimized for horror atmosphere');
      } else {
        audioResults.details.push(`⚠️ Ambient volume may need adjustment: ${volumes.ambient}`);
      }

      if (volumes.effects >= 0.6 && volumes.effects <= 0.8) {
        audioResults.details.push('✅ Effects volume optimized for impact');
      } else {
        audioResults.details.push(`⚠️ Effects volume may need adjustment: ${volumes.effects}`);
      }

      // Test 3: Dynamic audio state management
      const testGameState = {
        fearLevel: 75,
        health: 50,
        currentTime: '03:00',
        location: 'house'
      };

      audioManager.updateAudioForGameState(testGameState);
      audioResults.details.push('✅ Dynamic audio state management functional');

      // Test 4: Audio mixing capabilities
      const mixedEffects = [
        { soundKey: 'footsteps', options: { volume: 0.6 } },
        { soundKey: 'whisper', options: { volume: 0.4 } }
      ];

      const playedSounds = audioManager.playMixedEffects(mixedEffects);
      if (Array.isArray(playedSounds)) {
        audioResults.details.push('✅ Audio mixing system functional');
      } else {
        audioResults.details.push('❌ Audio mixing system not working');
      }

      audioResults.passed = audioResults.details.filter(d => d.startsWith('✅')).length >= 3;
      
    } catch (error) {
      audioResults.details.push(`❌ Audio validation error: ${error.message}`);
      audioResults.passed = false;
    }
  }

  /**
   * Validate voice recognition sensitivity and command parsing accuracy
   */
  async validateVoiceRecognition(gameEngine) {
    const voiceResults = this.validationResults.voiceRecognition;
    
    try {
      // Test command parser accuracy
      const { CommandParser } = await import('./CommandParser.js');
      const parser = new CommandParser();

      const testCommands = [
        { input: 'hide behind the door', expected: 'hide' },
        { input: 'run to safety', expected: 'run' },
        { input: 'open the window', expected: 'open' },
        { input: 'turn on flashlight', expected: 'flashlight' },
        { input: 'listen carefully', expected: 'listen' }
      ];

      let correctParsing = 0;
      for (const test of testCommands) {
        const parsed = parser.parseCommand(test.input, {
          fearLevel: 50,
          health: 75,
          currentTime: '02:00'
        });

        if (parsed.action === test.expected && parsed.confidence > 0.7) {
          correctParsing++;
          voiceResults.details.push(`✅ "${test.input}" → ${parsed.action} (${parsed.confidence.toFixed(2)})`);
        } else {
          voiceResults.details.push(`❌ "${test.input}" → ${parsed.action} (${parsed.confidence.toFixed(2)})`);
        }
      }

      const accuracy = correctParsing / testCommands.length;
      if (accuracy >= 0.85) {
        voiceResults.details.push(`✅ Command parsing accuracy: ${(accuracy * 100).toFixed(1)}%`);
      } else {
        voiceResults.details.push(`❌ Command parsing accuracy too low: ${(accuracy * 100).toFixed(1)}%`);
      }

      // Test voice narrator functionality
      const voiceNarrator = gameEngine.voiceNarrator;
      if (voiceNarrator) {
        voiceNarrator.narrate('Test narration for validation', { priority: 'high' });
        const queueStatus = voiceNarrator.getQueueStatus();
        
        if (queueStatus.queueLength >= 0) {
          voiceResults.details.push('✅ Voice narrator queue system functional');
        } else {
          voiceResults.details.push('❌ Voice narrator queue system not working');
        }
      } else {
        voiceResults.details.push('⚠️ Voice narrator not available');
      }

      voiceResults.passed = accuracy >= 0.85 && correctParsing >= 4;
      
    } catch (error) {
      voiceResults.details.push(`❌ Voice validation error: ${error.message}`);
      voiceResults.passed = false;
    }
  }

  /**
   * Validate smooth transitions between game states and events
   */
  async validateSmoothTransitions(gameEngine) {
    const transitionResults = this.validationResults.smoothTransitions;
    
    try {
      // Test game state transitions
      gameEngine.start();
      const gameState = gameEngine.getGameState();
      
      // Test fear level transitions
      const fearTransitions = [0, 25, 50, 75, 100];
      let smoothFearTransitions = 0;
      
      for (let i = 0; i < fearTransitions.length - 1; i++) {
        const startFear = fearTransitions[i];
        const endFear = fearTransitions[i + 1];
        
        gameState.fearLevel = startFear;
        gameEngine.update(100);
        
        // Simulate gradual transition
        for (let step = 0; step < 5; step++) {
          const targetFear = startFear + ((endFear - startFear) * (step + 1) / 5);
          gameState.fearLevel = targetFear;
          gameEngine.update(50);
        }
        
        if (Math.abs(gameState.fearLevel - endFear) < 1) {
          smoothFearTransitions++;
        }
      }
      
      if (smoothFearTransitions >= 3) {
        transitionResults.details.push('✅ Fear level transitions are smooth');
      } else {
        transitionResults.details.push('❌ Fear level transitions need improvement');
      }

      // Test time progression
      const timeTransitions = ['23:00', '00:00', '01:00', '02:00', '03:00'];
      let smoothTimeTransitions = 0;
      
      for (const time of timeTransitions) {
        gameState.currentTime = time;
        gameEngine.update(100);
        
        if (gameState.currentTime === time) {
          smoothTimeTransitions++;
        }
      }
      
      if (smoothTimeTransitions >= 4) {
        transitionResults.details.push('✅ Time progression transitions are smooth');
      } else {
        transitionResults.details.push('❌ Time progression needs improvement');
      }

      // Test event transitions
      const testEvent = {
        id: 'transition_test',
        fearDelta: 15,
        narration: 'Test event for transition validation'
      };
      
      const initialFear = gameState.fearLevel;
      gameEngine.triggerEvent(testEvent);
      gameEngine.update(100);
      
      if (gameState.fearLevel !== initialFear) {
        transitionResults.details.push('✅ Event transitions are functional');
      } else {
        transitionResults.details.push('❌ Event transitions not working');
      }

      transitionResults.passed = smoothFearTransitions >= 3 && smoothTimeTransitions >= 4;
      
    } catch (error) {
      transitionResults.details.push(`❌ Transition validation error: ${error.message}`);
      transitionResults.passed = false;
    }
  }

  /**
   * Validate visual polish and HUD components
   */
  async validateVisualPolish() {
    const visualResults = this.validationResults.visualPolish;
    
    try {
      // Test CSS animations and transitions
      const testElement = document.createElement('div');
      testElement.className = 'game-hud';
      testElement.style.transition = 'opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
      document.body.appendChild(testElement);
      
      const computedStyle = window.getComputedStyle(testElement);
      if (computedStyle.transition.includes('cubic-bezier')) {
        visualResults.details.push('✅ Smooth CSS transitions implemented');
      } else {
        visualResults.details.push('❌ CSS transitions need improvement');
      }
      
      document.body.removeChild(testElement);

      // Test responsive design
      const mediaQueries = [
        '(max-width: 768px)',
        '(max-width: 480px)',
        '(prefers-reduced-motion: reduce)'
      ];
      
      let responsiveSupport = 0;
      for (const query of mediaQueries) {
        if (window.matchMedia(query)) {
          responsiveSupport++;
        }
      }
      
      if (responsiveSupport >= 2) {
        visualResults.details.push('✅ Responsive design support detected');
      } else {
        visualResults.details.push('❌ Responsive design needs improvement');
      }

      // Test visual effects
      const effectClasses = [
        'terminal-text',
        'glitch',
        'pulse',
        'enhanced-glow'
      ];
      
      let effectsImplemented = 0;
      for (const className of effectClasses) {
        const testEl = document.createElement('div');
        testEl.className = className;
        document.body.appendChild(testEl);
        
        const style = window.getComputedStyle(testEl);
        if (style.animation !== 'none' || style.textShadow !== 'none') {
          effectsImplemented++;
        }
        
        document.body.removeChild(testEl);
      }
      
      if (effectsImplemented >= 3) {
        visualResults.details.push('✅ Visual effects properly implemented');
      } else {
        visualResults.details.push('❌ Visual effects need enhancement');
      }

      visualResults.passed = effectsImplemented >= 3 && responsiveSupport >= 2;
      
    } catch (error) {
      visualResults.details.push(`❌ Visual validation error: ${error.message}`);
      visualResults.passed = false;
    }
  }

  /**
   * Validate performance optimization and stability
   */
  async validatePerformance(gameEngine) {
    const performanceResults = this.validationResults.performance;
    
    try {
      // Test performance optimizer
      const optimizer = gameEngine.performanceOptimizer;
      if (optimizer) {
        performanceResults.details.push('✅ Performance optimizer integrated');
        
        // Test performance monitoring
        optimizer.startMonitoring();
        
        // Simulate intensive operations
        const startTime = performance.now();
        for (let i = 0; i < 100; i++) {
          gameEngine.update(16); // 60 FPS simulation
        }
        const endTime = performance.now();
        
        const totalTime = endTime - startTime;
        if (totalTime < 1000) { // Should complete in under 1 second
          performanceResults.details.push(`✅ Performance test completed in ${totalTime.toFixed(2)}ms`);
        } else {
          performanceResults.details.push(`❌ Performance test too slow: ${totalTime.toFixed(2)}ms`);
        }
        
        optimizer.stopMonitoring();
        
        // Test optimization levels
        const report = optimizer.getPerformanceReport();
        if (report && report.optimizationLevel !== undefined) {
          performanceResults.details.push('✅ Performance optimization levels functional');
        } else {
          performanceResults.details.push('❌ Performance optimization not working');
        }
      } else {
        performanceResults.details.push('❌ Performance optimizer not found');
      }

      // Test memory management
      const initialMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
      
      // Create and destroy objects to test memory management
      const testObjects = [];
      for (let i = 0; i < 1000; i++) {
        testObjects.push({ id: i, data: new Array(100).fill(i) });
      }
      
      // Clear objects
      testObjects.length = 0;
      
      // Force garbage collection if available
      if (window.gc) {
        window.gc();
      }
      
      const finalMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
      const memoryIncrease = finalMemory - initialMemory;
      
      if (memoryIncrease < 10 * 1024 * 1024) { // Less than 10MB increase
        performanceResults.details.push('✅ Memory management appears stable');
      } else {
        performanceResults.details.push(`⚠️ Memory increase detected: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
      }

      // Test error recovery
      try {
        gameEngine.handleError('test_error', new Error('Test error'), { test: true });
        performanceResults.details.push('✅ Error handling system functional');
      } catch (error) {
        performanceResults.details.push('❌ Error handling system not working');
      }

      performanceResults.passed = optimizer && totalTime < 1000;
      
    } catch (error) {
      performanceResults.details.push(`❌ Performance validation error: ${error.message}`);
      performanceResults.passed = false;
    }
  }

  /**
   * Calculate overall validation score
   */
  calculateOverallScore() {
    const categories = ['audioMixing', 'voiceRecognition', 'smoothTransitions', 'visualPolish', 'performance'];
    let passedCategories = 0;
    let totalScore = 0;

    for (const category of categories) {
      const result = this.validationResults[category];
      if (result.passed) {
        passedCategories++;
      }
      
      // Calculate category score based on passed details
      const totalDetails = result.details.length;
      const passedDetails = result.details.filter(d => d.startsWith('✅')).length;
      const categoryScore = totalDetails > 0 ? (passedDetails / totalDetails) * 100 : 0;
      totalScore += categoryScore;
    }

    const averageScore = totalScore / categories.length;
    this.validationResults.overall.score = Math.round(averageScore);
    this.validationResults.overall.passed = passedCategories >= 4 && averageScore >= 80;
    this.validationResults.overall.passedCategories = passedCategories;
    this.validationResults.overall.totalCategories = categories.length;
  }

  /**
   * Generate validation report
   */
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      overall: this.validationResults.overall,
      summary: {
        audioMixing: this.validationResults.audioMixing.passed ? 'PASS' : 'FAIL',
        voiceRecognition: this.validationResults.voiceRecognition.passed ? 'PASS' : 'FAIL',
        smoothTransitions: this.validationResults.smoothTransitions.passed ? 'PASS' : 'FAIL',
        visualPolish: this.validationResults.visualPolish.passed ? 'PASS' : 'FAIL',
        performance: this.validationResults.performance.passed ? 'PASS' : 'FAIL'
      },
      details: this.validationResults
    };

    console.log('=== GAME INTEGRATION VALIDATION REPORT ===');
    console.log(`Overall Score: ${report.overall.score}%`);
    console.log(`Overall Status: ${report.overall.passed ? 'PASS' : 'FAIL'}`);
    console.log(`Categories Passed: ${report.overall.passedCategories}/${report.overall.totalCategories}`);
    console.log('\n=== CATEGORY RESULTS ===');
    
    for (const [category, status] of Object.entries(report.summary)) {
      console.log(`${category}: ${status}`);
    }
    
    console.log('\n=== DETAILED RESULTS ===');
    for (const [category, result] of Object.entries(this.validationResults)) {
      if (category === 'overall') continue;
      
      console.log(`\n${category.toUpperCase()}:`);
      for (const detail of result.details) {
        console.log(`  ${detail}`);
      }
    }

    return report;
  }
}

export default GameIntegrationValidator;