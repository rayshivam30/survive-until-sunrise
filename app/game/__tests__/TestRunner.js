/**
 * Test Runner for Comprehensive Game Testing
 * Orchestrates different types of tests and provides detailed reporting
 */

class TestRunner {
  constructor() {
    this.testSuites = {
      unit: [],
      integration: [],
      performance: [],
      compatibility: []
    };
    
    this.results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      total: 0,
      duration: 0,
      coverage: {}
    };
    
    this.startTime = null;
  }

  /**
   * Register test suites by category
   */
  registerTestSuite(category, suiteName, testFunction) {
    if (!this.testSuites[category]) {
      this.testSuites[category] = [];
    }
    
    this.testSuites[category].push({
      name: suiteName,
      test: testFunction,
      status: 'pending'
    });
  }

  /**
   * Run all tests in a specific category
   */
  async runCategory(category) {
    const suites = this.testSuites[category] || [];
    const results = [];
    
    console.log(`\n🧪 Running ${category} tests...`);
    
    for (const suite of suites) {
      try {
        console.log(`  ▶️  ${suite.name}`);
        const startTime = performance.now();
        
        await suite.test();
        
        const duration = performance.now() - startTime;
        suite.status = 'passed';
        suite.duration = duration;
        
        console.log(`  ✅ ${suite.name} (${duration.toFixed(2)}ms)`);
        this.results.passed++;
        
      } catch (error) {
        suite.status = 'failed';
        suite.error = error;
        
        console.log(`  ❌ ${suite.name}: ${error.message}`);
        this.results.failed++;
      }
      
      results.push(suite);
      this.results.total++;
    }
    
    return results;
  }

  /**
   * Run all tests
   */
  async runAll() {
    this.startTime = performance.now();
    
    console.log('🚀 Starting comprehensive test suite...\n');
    
    const allResults = {};
    
    // Run tests in order of importance
    const categories = ['unit', 'integration', 'performance', 'compatibility'];
    
    for (const category of categories) {
      allResults[category] = await this.runCategory(category);
    }
    
    this.results.duration = performance.now() - this.startTime;
    
    this.printSummary(allResults);
    
    return allResults;
  }

  /**
   * Run performance benchmarks
   */
  async runPerformanceBenchmarks() {
    console.log('\n⚡ Running performance benchmarks...');
    
    const benchmarks = [
      {
        name: 'Audio Loading Speed',
        test: this.benchmarkAudioLoading.bind(this)
      },
      {
        name: 'Voice Command Processing',
        test: this.benchmarkVoiceProcessing.bind(this)
      },
      {
        name: 'Game State Updates',
        test: this.benchmarkGameStateUpdates.bind(this)
      },
      {
        name: 'Memory Usage',
        test: this.benchmarkMemoryUsage.bind(this)
      }
    ];
    
    const results = [];
    
    for (const benchmark of benchmarks) {
      try {
        const result = await benchmark.test();
        results.push({
          name: benchmark.name,
          ...result,
          status: 'passed'
        });
        
        console.log(`  ✅ ${benchmark.name}: ${result.summary}`);
      } catch (error) {
        results.push({
          name: benchmark.name,
          status: 'failed',
          error: error.message
        });
        
        console.log(`  ❌ ${benchmark.name}: ${error.message}`);
      }
    }
    
    return results;
  }

  /**
   * Benchmark audio loading performance
   */
  async benchmarkAudioLoading() {
    const AudioManager = (await import('../utils/AudioManager.js')).default;
    const audioManager = new AudioManager();
    
    const startTime = performance.now();
    await audioManager.initialize(jest.fn());
    const initTime = performance.now() - startTime;
    
    const loadStartTime = performance.now();
    audioManager.playEffect('jump_scare');
    audioManager.playAmbient('forest_night');
    const loadTime = performance.now() - loadStartTime;
    
    audioManager.destroy();
    
    return {
      initTime,
      loadTime,
      summary: `Init: ${initTime.toFixed(2)}ms, Load: ${loadTime.toFixed(2)}ms`,
      passed: initTime < 1000 && loadTime < 100
    };
  }

  /**
   * Benchmark voice command processing
   */
  async benchmarkVoiceProcessing() {
    const { CommandParser } = await import('../utils/CommandParser.js');
    const parser = new CommandParser();
    
    const commands = [
      'hide behind the door',
      'turn on the flashlight',
      'listen carefully for sounds',
      'run to the basement quickly'
    ];
    
    const startTime = performance.now();
    
    const results = commands.map(cmd => parser.parseCommand(cmd));
    
    const totalTime = performance.now() - startTime;
    const avgTime = totalTime / commands.length;
    
    return {
      totalTime,
      avgTime,
      commandsProcessed: commands.length,
      summary: `${commands.length} commands in ${totalTime.toFixed(2)}ms (avg: ${avgTime.toFixed(2)}ms)`,
      passed: avgTime < 10
    };
  }

  /**
   * Benchmark game state updates
   */
  async benchmarkGameStateUpdates() {
    const { GameEngine } = await import('../engine/GameEngine.js');
    const gameEngine = new GameEngine();
    
    gameEngine.start();
    
    const startTime = performance.now();
    
    // Simulate rapid game state updates
    for (let i = 0; i < 100; i++) {
      gameEngine.update(16.67); // 60 FPS
      gameEngine.handleCommand(`command-${i}`);
      
      if (i % 10 === 0) {
        gameEngine.triggerEvent({ id: `event-${i}`, fearDelta: 1 });
      }
    }
    
    const totalTime = performance.now() - startTime;
    const avgUpdateTime = totalTime / 100;
    
    gameEngine.stop();
    
    return {
      totalTime,
      avgUpdateTime,
      updatesProcessed: 100,
      summary: `100 updates in ${totalTime.toFixed(2)}ms (avg: ${avgUpdateTime.toFixed(2)}ms)`,
      passed: avgUpdateTime < 5
    };
  }

  /**
   * Benchmark memory usage
   */
  async benchmarkMemoryUsage() {
    const initialMemory = process.memoryUsage?.()?.heapUsed || 0;
    
    // Create and destroy multiple game instances
    const { GameEngine } = await import('../engine/GameEngine.js');
    
    for (let i = 0; i < 10; i++) {
      const engine = new GameEngine();
      engine.start();
      
      // Simulate gameplay
      for (let j = 0; j < 50; j++) {
        engine.handleCommand(`test-${j}`);
        engine.update(16);
      }
      
      engine.stop();
    }
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    const finalMemory = process.memoryUsage?.()?.heapUsed || 0;
    const memoryIncrease = finalMemory - initialMemory;
    const memoryIncreaseMB = memoryIncrease / (1024 * 1024);
    
    return {
      initialMemory,
      finalMemory,
      memoryIncrease,
      memoryIncreaseMB,
      summary: `Memory increase: ${memoryIncreaseMB.toFixed(2)}MB`,
      passed: memoryIncreaseMB < 50 // Should not increase by more than 50MB
    };
  }

  /**
   * Run browser compatibility tests
   */
  async runCompatibilityTests() {
    console.log('\n🌐 Running browser compatibility tests...');
    
    const { BrowserCompatibility } = await import('../utils/BrowserCompatibility.js');
    const compatibility = new BrowserCompatibility();
    
    const tests = [
      {
        name: 'Speech Recognition API',
        test: () => compatibility.checkSpeechRecognition()
      },
      {
        name: 'Speech Synthesis API',
        test: () => compatibility.checkSpeechSynthesis()
      },
      {
        name: 'Audio Context API',
        test: () => compatibility.checkAudioContext()
      },
      {
        name: 'Media Devices API',
        test: () => compatibility.checkMediaDevices()
      },
      {
        name: 'Local Storage',
        test: () => compatibility.checkLocalStorage()
      },
      {
        name: 'Secure Context',
        test: () => compatibility.checkSecureContext()
      }
    ];
    
    const results = [];
    
    for (const test of tests) {
      try {
        const result = test.test();
        results.push({
          name: test.name,
          supported: result.supported,
          details: result,
          status: 'completed'
        });
        
        const status = result.supported ? '✅' : '⚠️';
        console.log(`  ${status} ${test.name}: ${result.supported ? 'Supported' : 'Not supported'}`);
        
      } catch (error) {
        results.push({
          name: test.name,
          supported: false,
          error: error.message,
          status: 'error'
        });
        
        console.log(`  ❌ ${test.name}: Error - ${error.message}`);
      }
    }
    
    return results;
  }

  /**
   * Print comprehensive test summary
   */
  printSummary(results) {
    console.log('\n📊 Test Summary');
    console.log('================');
    
    console.log(`Total Tests: ${this.results.total}`);
    console.log(`Passed: ${this.results.passed} ✅`);
    console.log(`Failed: ${this.results.failed} ❌`);
    console.log(`Duration: ${this.results.duration.toFixed(2)}ms`);
    
    if (this.results.failed > 0) {
      console.log('\n❌ Failed Tests:');
      Object.values(results).flat().forEach(suite => {
        if (suite.status === 'failed') {
          console.log(`  - ${suite.name}: ${suite.error?.message || 'Unknown error'}`);
        }
      });
    }
    
    const successRate = (this.results.passed / this.results.total) * 100;
    console.log(`\nSuccess Rate: ${successRate.toFixed(1)}%`);
    
    if (successRate >= 95) {
      console.log('🎉 Excellent! All systems are working well.');
    } else if (successRate >= 80) {
      console.log('👍 Good! Most systems are working correctly.');
    } else if (successRate >= 60) {
      console.log('⚠️  Warning! Some systems need attention.');
    } else {
      console.log('🚨 Critical! Many systems are failing.');
    }
  }

  /**
   * Generate detailed test report
   */
  generateReport(results) {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.results.total,
        passed: this.results.passed,
        failed: this.results.failed,
        duration: this.results.duration,
        successRate: (this.results.passed / this.results.total) * 100
      },
      categories: {},
      recommendations: []
    };
    
    // Process results by category
    Object.entries(results).forEach(([category, suites]) => {
      report.categories[category] = {
        total: suites.length,
        passed: suites.filter(s => s.status === 'passed').length,
        failed: suites.filter(s => s.status === 'failed').length,
        suites: suites.map(s => ({
          name: s.name,
          status: s.status,
          duration: s.duration,
          error: s.error?.message
        }))
      };
    });
    
    // Generate recommendations
    if (report.summary.successRate < 100) {
      report.recommendations.push('Review failed tests and fix underlying issues');
    }
    
    if (report.summary.duration > 10000) {
      report.recommendations.push('Consider optimizing test performance');
    }
    
    return report;
  }
}

export default TestRunner;