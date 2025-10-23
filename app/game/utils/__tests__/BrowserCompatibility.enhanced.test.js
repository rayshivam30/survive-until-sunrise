/**
 * Enhanced Browser Compatibility Tests
 * Comprehensive tests for Web API compatibility and fallback mechanisms
 */

import { BrowserCompatibility } from '../BrowserCompatibility.js';

// Mock console methods to reduce test noise
const originalConsole = { ...console };
beforeAll(() => {
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  Object.assign(console, originalConsole);
});

describe('Enhanced Browser Compatibility Tests', () => {
  let compatibility;

  beforeEach(() => {
    compatibility = new BrowserCompatibility();
    
    // Reset all browser APIs
    delete window.SpeechRecognition;
    delete window.webkitSpeechRecognition;
    delete window.AudioContext;
    delete window.webkitAudioContext;
    delete window.speechSynthesis;
    
    // Reset navigator properties
    Object.defineProperty(navigator, 'mediaDevices', {
      value: undefined,
      writable: true,
      configurable: true
    });
    
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Test Browser)',
      writable: true,
      configurable: true
    });
    
    // Reset localStorage and sessionStorage
    const mockStorage = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn()
    };
    
    Object.defineProperty(window, 'localStorage', {
      value: mockStorage,
      writable: true,
      configurable: true
    });
    
    Object.defineProperty(window, 'sessionStorage', {
      value: mockStorage,
      writable: true,
      configurable: true
    });
  });

  describe('Web Speech API Compatibility', () => {
    test('should detect and validate SpeechRecognition API', () => {
      // Mock SpeechRecognition with all required properties
      const mockRecognition = jest.fn().mockImplementation(() => ({
        continuous: false,
        interimResults: false,
        lang: '',
        maxAlternatives: 1,
        start: jest.fn(),
        stop: jest.fn(),
        abort: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      }));
      
      window.SpeechRecognition = mockRecognition;
      
      const result = compatibility.checkSpeechRecognition();
      
      expect(result.supported).toBe(true);
      expect(result.vendor).toBe('standard');
      expect(result.features).toEqual(
        expect.objectContaining({
          continuous: true,
          interimResults: true,
          maxAlternatives: true
        })
      );
    });

    test('should detect webkit SpeechRecognition with feature validation', () => {
      const mockRecognition = jest.fn().mockImplementation(() => ({
        continuous: false,
        interimResults: false,
        lang: '',
        start: jest.fn(),
        stop: jest.fn(),
        abort: jest.fn()
      }));
      
      window.webkitSpeechRecognition = mockRecognition;
      
      const result = compatibility.checkSpeechRecognition();
      
      expect(result.supported).toBe(true);
      expect(result.vendor).toBe('webkit');
      expect(result.limitations).toContain('webkit-specific');
    });

    test('should provide detailed fallback for missing SpeechRecognition', () => {
      const result = compatibility.checkSpeechRecognition();
      
      expect(result.supported).toBe(false);
      expect(result.fallback).toEqual(
        expect.objectContaining({
          type: 'text-input',
          description: expect.stringContaining('keyboard'),
          implementation: expect.any(Function)
        })
      );
    });

    test('should validate SpeechSynthesis voice availability', () => {
      const mockVoices = [
        { name: 'English Voice', lang: 'en-US', default: true },
        { name: 'British Voice', lang: 'en-GB', default: false },
        { name: 'French Voice', lang: 'fr-FR', default: false }
      ];
      
      window.speechSynthesis = {
        getVoices: jest.fn().mockReturnValue(mockVoices),
        speak: jest.fn(),
        cancel: jest.fn(),
        pause: jest.fn(),
        resume: jest.fn(),
        speaking: false,
        pending: false,
        paused: false
      };
      
      const result = compatibility.checkSpeechSynthesis();
      
      expect(result.supported).toBe(true);
      expect(result.voiceCount).toBe(3);
      expect(result.hasEnglishVoices).toBe(true);
      expect(result.defaultVoice).toEqual(
        expect.objectContaining({
          name: 'English Voice',
          lang: 'en-US'
        })
      );
    });
  });

  describe('Audio API Compatibility', () => {
    test('should validate AudioContext with comprehensive feature detection', () => {
      const mockAudioContext = jest.fn().mockImplementation(() => ({
        sampleRate: 44100,
        state: 'running',
        currentTime: 0,
        destination: {},
        listener: {},
        createOscillator: jest.fn(),
        createGain: jest.fn(),
        createAnalyser: jest.fn(),
        createBufferSource: jest.fn(),
        decodeAudioData: jest.fn(),
        close: jest.fn(),
        suspend: jest.fn(),
        resume: jest.fn()
      }));
      
      window.AudioContext = mockAudioContext;
      
      const result = compatibility.checkAudioContext();
      
      expect(result.supported).toBe(true);
      expect(result.sampleRate).toBe(44100);
      expect(result.features).toEqual(
        expect.objectContaining({
          oscillator: true,
          gain: true,
          analyser: true,
          bufferSource: true,
          decodeAudioData: true
        })
      );
    });

    test('should detect Web Audio API limitations', () => {
      const mockAudioContext = jest.fn().mockImplementation(() => ({
        sampleRate: 22050, // Lower sample rate
        state: 'suspended',
        currentTime: 0,
        destination: {},
        createOscillator: jest.fn(),
        createGain: jest.fn(),
        close: jest.fn()
        // Missing some methods
      }));
      
      window.AudioContext = mockAudioContext;
      
      const result = compatibility.checkAudioContext();
      
      expect(result.supported).toBe(true);
      expect(result.limitations).toContain('low-sample-rate');
      expect(result.limitations).toContain('suspended-state');
      expect(result.limitations).toContain('missing-features');
    });

    test('should provide audio fallback strategies', () => {
      const result = compatibility.checkAudioContext();
      
      expect(result.supported).toBe(false);
      expect(result.fallback).toEqual(
        expect.objectContaining({
          type: 'html5-audio',
          description: expect.stringContaining('HTML5'),
          limitations: expect.arrayContaining(['no-real-time-processing'])
        })
      );
    });
  });

  describe('Media Devices API Compatibility', () => {
    test('should validate comprehensive MediaDevices support', () => {
      const mockMediaDevices = {
        getUserMedia: jest.fn(),
        enumerateDevices: jest.fn().mockResolvedValue([
          { kind: 'audioinput', label: 'Microphone' },
          { kind: 'audiooutput', label: 'Speakers' }
        ]),
        getSupportedConstraints: jest.fn().mockReturnValue({
          audio: true,
          video: true,
          echoCancellation: true,
          noiseSuppression: true
        })
      };
      
      Object.defineProperty(navigator, 'mediaDevices', {
        value: mockMediaDevices,
        writable: true,
        configurable: true
      });
      
      const result = compatibility.checkMediaDevices();
      
      expect(result.supported).toBe(true);
      expect(result.features).toEqual(
        expect.objectContaining({
          getUserMedia: true,
          enumerateDevices: true,
          getSupportedConstraints: true,
          echoCancellation: true,
          noiseSuppression: true
        })
      );
    });

    test('should detect microphone permission requirements', async () => {
      const mockMediaDevices = {
        getUserMedia: jest.fn().mockRejectedValue(new Error('Permission denied')),
        enumerateDevices: jest.fn().mockResolvedValue([])
      };
      
      Object.defineProperty(navigator, 'mediaDevices', {
        value: mockMediaDevices,
        writable: true,
        configurable: true
      });
      
      const result = await compatibility.checkMicrophoneAccess();
      
      expect(result.supported).toBe(false);
      expect(result.error).toBe('Permission denied');
      expect(result.requiresUserGesture).toBe(true);
    });
  });

  describe('Storage API Compatibility', () => {
    test('should validate localStorage with quota detection', () => {
      const mockLocalStorage = {
        getItem: jest.fn().mockReturnValue('test'),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
        length: 0,
        key: jest.fn()
      };
      
      Object.defineProperty(window, 'localStorage', {
        value: mockLocalStorage,
        writable: true,
        configurable: true
      });
      
      const result = compatibility.checkLocalStorage();
      
      expect(result.supported).toBe(true);
      expect(result.quota).toBeDefined();
      expect(result.features).toEqual(
        expect.objectContaining({
          getItem: true,
          setItem: true,
          removeItem: true,
          clear: true
        })
      );
    });

    test('should detect storage quota limitations', () => {
      const mockLocalStorage = {
        getItem: jest.fn(),
        setItem: jest.fn().mockImplementation(() => {
          throw new Error('QuotaExceededError');
        }),
        removeItem: jest.fn(),
        clear: jest.fn()
      };
      
      Object.defineProperty(window, 'localStorage', {
        value: mockLocalStorage,
        writable: true,
        configurable: true
      });
      
      const result = compatibility.checkLocalStorage();
      
      expect(result.supported).toBe(false);
      expect(result.error).toBe('QuotaExceededError');
      expect(result.fallback).toEqual(
        expect.objectContaining({
          type: 'memory-storage',
          description: expect.stringContaining('memory')
        })
      );
    });
  });

  describe('Security Context Validation', () => {
    test('should validate HTTPS requirement for sensitive APIs', () => {
      // Mock secure context
      Object.defineProperty(window, 'isSecureContext', {
        value: true,
        writable: true,
        configurable: true
      });
      
      Object.defineProperty(window, 'location', {
        value: {
          protocol: 'https:',
          hostname: 'example.com',
          href: 'https://example.com'
        },
        writable: true,
        configurable: true
      });
      
      const result = compatibility.checkSecureContext();
      
      expect(result.supported).toBe(true);
      expect(result.protocol).toBe('https:');
      expect(result.isSecureContext).toBe(true);
    });

    test('should allow localhost over HTTP', () => {
      Object.defineProperty(window, 'isSecureContext', {
        value: true,
        writable: true,
        configurable: true
      });
      
      Object.defineProperty(window, 'location', {
        value: {
          protocol: 'http:',
          hostname: 'localhost',
          href: 'http://localhost:3000'
        },
        writable: true,
        configurable: true
      });
      
      const result = compatibility.checkSecureContext();
      
      expect(result.supported).toBe(true);
      expect(result.allowedReason).toBe('localhost-exception');
    });

    test('should reject insecure contexts for production', () => {
      Object.defineProperty(window, 'isSecureContext', {
        value: false,
        writable: true,
        configurable: true
      });
      
      Object.defineProperty(window, 'location', {
        value: {
          protocol: 'http:',
          hostname: 'example.com',
          href: 'http://example.com'
        },
        writable: true,
        configurable: true
      });
      
      const result = compatibility.checkSecureContext();
      
      expect(result.supported).toBe(false);
      expect(result.reason).toBe('insecure-context');
      expect(result.recommendation).toContain('HTTPS');
    });
  });

  describe('Browser-Specific Compatibility', () => {
    test('should detect Chrome with version-specific features', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        writable: true,
        configurable: true
      });
      
      const result = compatibility.getBrowserInfo();
      
      expect(result.name).toBe('chrome');
      expect(result.version).toBe(91);
      expect(result.features).toEqual(
        expect.objectContaining({
          speechRecognition: 'excellent',
          audioContext: 'excellent',
          mediaDevices: 'excellent'
        })
      );
    });

    test('should detect Firefox with known limitations', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
        writable: true,
        configurable: true
      });
      
      const result = compatibility.getBrowserInfo();
      
      expect(result.name).toBe('firefox');
      expect(result.version).toBe(89);
      expect(result.limitations).toContain('speech-recognition-limited');
    });

    test('should detect Safari with WebKit-specific issues', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
        writable: true,
        configurable: true
      });
      
      const result = compatibility.getBrowserInfo();
      
      expect(result.name).toBe('safari');
      expect(result.version).toBe(14);
      expect(result.limitations).toContain('audio-context-requires-gesture');
      expect(result.limitations).toContain('speech-synthesis-limited');
    });

    test('should detect outdated browsers', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.102 Safari/537.36',
        writable: true,
        configurable: true
      });
      
      const result = compatibility.checkModernBrowser();
      
      expect(result.supported).toBe(false);
      expect(result.reason).toBe('outdated-version');
      expect(result.recommendation).toContain('update');
      expect(result.minimumVersion).toBeDefined();
    });
  });

  describe('Feature Detection and Polyfills', () => {
    test('should detect missing features and suggest polyfills', () => {
      const results = compatibility.checkCompatibility();
      
      const missingFeatures = Object.entries(results.features)
        .filter(([, feature]) => !feature.supported)
        .map(([name]) => name);
      
      const polyfills = compatibility.suggestPolyfills(missingFeatures);
      
      expect(polyfills).toBeInstanceOf(Array);
      polyfills.forEach(polyfill => {
        expect(polyfill).toEqual(
          expect.objectContaining({
            feature: expect.any(String),
            polyfill: expect.any(String),
            url: expect.any(String),
            size: expect.any(String)
          })
        );
      });
    });

    test('should provide progressive enhancement strategies', () => {
      const mockResults = {
        features: {
          speechRecognition: { supported: false },
          speechSynthesis: { supported: true },
          audioContext: { supported: false },
          localStorage: { supported: true }
        }
      };
      
      const strategies = compatibility.getProgressiveEnhancementStrategies(mockResults);
      
      expect(strategies).toEqual(
        expect.objectContaining({
          core: expect.arrayContaining(['text-based-interaction']),
          enhanced: expect.arrayContaining(['voice-narration']),
          premium: expect.arrayContaining(['full-audio-experience'])
        })
      );
    });
  });

  describe('Performance Impact Assessment', () => {
    test('should assess performance impact of missing features', () => {
      const mockResults = {
        features: {
          speechRecognition: { supported: false },
          audioContext: { supported: false },
          localStorage: { supported: true }
        }
      };
      
      const impact = compatibility.assessPerformanceImpact(mockResults);
      
      expect(impact).toEqual(
        expect.objectContaining({
          overall: expect.stringMatching(/low|medium|high/),
          details: expect.objectContaining({
            userExperience: expect.any(String),
            performance: expect.any(String),
            functionality: expect.any(String)
          })
        })
      );
    });

    test('should recommend optimization strategies', () => {
      const mockResults = {
        features: {
          speechRecognition: { supported: true },
          audioContext: { supported: true },
          localStorage: { supported: true }
        },
        browserInfo: {
          name: 'chrome',
          version: 91
        }
      };
      
      const optimizations = compatibility.getOptimizationRecommendations(mockResults);
      
      expect(optimizations).toBeInstanceOf(Array);
      optimizations.forEach(optimization => {
        expect(optimization).toEqual(
          expect.objectContaining({
            category: expect.any(String),
            recommendation: expect.any(String),
            impact: expect.stringMatching(/low|medium|high/)
          })
        );
      });
    });
  });

  describe('Real-time Compatibility Monitoring', () => {
    test('should monitor API availability changes', () => {
      const monitor = compatibility.createCompatibilityMonitor();
      const callback = jest.fn();
      
      monitor.onCompatibilityChange(callback);
      
      // Simulate API becoming unavailable
      delete window.speechSynthesis;
      monitor.checkChanges();
      
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          feature: 'speechSynthesis',
          previousState: true,
          currentState: false,
          timestamp: expect.any(Number)
        })
      );
      
      monitor.destroy();
    });

    test('should detect permission changes', async () => {
      const monitor = compatibility.createCompatibilityMonitor();
      const callback = jest.fn();
      
      monitor.onPermissionChange(callback);
      
      // Simulate permission change
      const mockPermissions = {
        query: jest.fn().mockResolvedValue({
          state: 'denied',
          onchange: null
        })
      };
      
      Object.defineProperty(navigator, 'permissions', {
        value: mockPermissions,
        writable: true,
        configurable: true
      });
      
      await monitor.checkPermissions();
      
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          permission: 'microphone',
          state: 'denied',
          timestamp: expect.any(Number)
        })
      );
      
      monitor.destroy();
    });
  });

  describe('Compatibility Reporting', () => {
    test('should generate comprehensive compatibility report', () => {
      const report = compatibility.generateCompatibilityReport();
      
      expect(report).toEqual(
        expect.objectContaining({
          timestamp: expect.any(Number),
          userAgent: expect.any(String),
          browserInfo: expect.any(Object),
          features: expect.any(Object),
          overall: expect.stringMatching(/excellent|good|fair|poor|incompatible/),
          score: expect.any(Number),
          recommendations: expect.any(Array),
          fallbacks: expect.any(Array),
          polyfills: expect.any(Array)
        })
      );
    });

    test('should export compatibility data for analytics', () => {
      const exportData = compatibility.exportCompatibilityData();
      
      expect(exportData).toEqual(
        expect.objectContaining({
          version: expect.any(String),
          timestamp: expect.any(Number),
          sessionId: expect.any(String),
          features: expect.any(Object),
          performance: expect.any(Object),
          errors: expect.any(Array)
        })
      );
      
      // Should be JSON serializable
      expect(() => JSON.stringify(exportData)).not.toThrow();
    });
  });
});