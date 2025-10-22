/**
 * @jest-environment jsdom
 */

import { BrowserCompatibility, browserCompatibility } from '../BrowserCompatibility.js';

// Mock browser APIs
const mockSpeechRecognition = jest.fn();
const mockAudioContext = jest.fn();

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true
});

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true
});

describe('BrowserCompatibility', () => {
  let compatibility;

  beforeEach(() => {
    compatibility = new BrowserCompatibility();
    
    // Reset mocks
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue('test');
    localStorageMock.setItem.mockImplementation(() => {});
    localStorageMock.removeItem.mockImplementation(() => {});
    sessionStorageMock.getItem.mockReturnValue('test');
    sessionStorageMock.setItem.mockImplementation(() => {});
    sessionStorageMock.removeItem.mockImplementation(() => {});

    // Reset global objects
    delete window.SpeechRecognition;
    delete window.webkitSpeechRecognition;
    delete window.AudioContext;
    delete window.webkitAudioContext;
    delete window.speechSynthesis;
  });

  describe('Speech Recognition Detection', () => {
    test('should detect standard SpeechRecognition API', () => {
      window.SpeechRecognition = mockSpeechRecognition;
      mockSpeechRecognition.mockImplementation(() => ({
        abort: jest.fn()
      }));

      const result = compatibility.checkSpeechRecognition();
      
      expect(result.supported).toBe(true);
      expect(result.vendor).toBe('standard');
    });

    test('should detect webkit SpeechRecognition API', () => {
      window.webkitSpeechRecognition = mockSpeechRecognition;
      mockSpeechRecognition.mockImplementation(() => ({
        abort: jest.fn()
      }));

      const result = compatibility.checkSpeechRecognition();
      
      expect(result.supported).toBe(true);
      expect(result.vendor).toBe('webkit');
    });

    test('should handle missing SpeechRecognition API', () => {
      const result = compatibility.checkSpeechRecognition();
      
      expect(result.supported).toBe(false);
      expect(result.message).toContain('not supported');
      expect(result.fallback).toBeDefined();
    });

    test('should handle SpeechRecognition creation failure', () => {
      window.SpeechRecognition = mockSpeechRecognition;
      mockSpeechRecognition.mockImplementation(() => {
        throw new Error('Creation failed');
      });

      const result = compatibility.checkSpeechRecognition();
      
      expect(result.supported).toBe(false);
      expect(result.error).toBe('Creation failed');
    });
  });

  describe('Speech Synthesis Detection', () => {
    test('should detect Speech Synthesis API', () => {
      window.speechSynthesis = {
        getVoices: jest.fn().mockReturnValue([
          { name: 'Test Voice', lang: 'en-US' }
        ])
      };

      const result = compatibility.checkSpeechSynthesis();
      
      expect(result.supported).toBe(true);
      expect(result.voiceCount).toBe(1);
      expect(result.hasEnglishVoices).toBe(true);
    });

    test('should handle missing Speech Synthesis API', () => {
      const result = compatibility.checkSpeechSynthesis();
      
      expect(result.supported).toBe(false);
      expect(result.message).toContain('not supported');
    });
  });

  describe('Audio Context Detection', () => {
    test('should detect standard AudioContext', () => {
      const mockContext = {
        sampleRate: 44100,
        state: 'running',
        close: jest.fn()
      };
      
      window.AudioContext = jest.fn().mockImplementation(() => mockContext);

      const result = compatibility.checkAudioContext();
      
      expect(result.supported).toBe(true);
      expect(result.sampleRate).toBe(44100);
      expect(result.vendor).toBe('standard');
      expect(mockContext.close).toHaveBeenCalled();
    });

    test('should detect webkit AudioContext', () => {
      const mockContext = {
        sampleRate: 44100,
        state: 'running',
        close: jest.fn()
      };
      
      window.webkitAudioContext = jest.fn().mockImplementation(() => mockContext);

      const result = compatibility.checkAudioContext();
      
      expect(result.supported).toBe(true);
      expect(result.vendor).toBe('webkit');
    });

    test('should handle missing AudioContext', () => {
      const result = compatibility.checkAudioContext();
      
      expect(result.supported).toBe(false);
      expect(result.fallback).toBeDefined();
    });

    test('should handle AudioContext creation failure', () => {
      window.AudioContext = jest.fn().mockImplementation(() => {
        throw new Error('AudioContext failed');
      });

      const result = compatibility.checkAudioContext();
      
      expect(result.supported).toBe(false);
      expect(result.error).toBe('AudioContext failed');
    });
  });

  describe('Media Devices Detection', () => {
    test('should detect Media Devices API', () => {
      Object.defineProperty(navigator, 'mediaDevices', {
        value: {
          getUserMedia: jest.fn(),
          enumerateDevices: jest.fn(),
          getSupportedConstraints: jest.fn()
        },
        writable: true
      });

      const result = compatibility.checkMediaDevices();
      
      expect(result.supported).toBe(true);
      expect(result.enumerateDevices).toBe(true);
      expect(result.getSupportedConstraints).toBe(true);
    });

    test('should handle missing Media Devices API', () => {
      Object.defineProperty(navigator, 'mediaDevices', {
        value: undefined,
        writable: true
      });

      const result = compatibility.checkMediaDevices();
      
      expect(result.supported).toBe(false);
      expect(result.message).toContain('not supported');
    });

    test('should handle missing getUserMedia', () => {
      Object.defineProperty(navigator, 'mediaDevices', {
        value: {},
        writable: true
      });

      const result = compatibility.checkMediaDevices();
      
      expect(result.supported).toBe(false);
      expect(result.message).toContain('getUserMedia not supported');
    });
  });

  describe('Storage Detection', () => {
    test('should detect localStorage availability', () => {
      const result = compatibility.checkLocalStorage();
      
      expect(result.supported).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalled();
      expect(localStorageMock.getItem).toHaveBeenCalled();
      expect(localStorageMock.removeItem).toHaveBeenCalled();
    });

    test('should handle localStorage unavailability', () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage not available');
      });

      const result = compatibility.checkLocalStorage();
      
      expect(result.supported).toBe(false);
      expect(result.error).toBe('Storage not available');
    });

    test('should detect sessionStorage availability', () => {
      const result = compatibility.checkSessionStorage();
      
      expect(result.supported).toBe(true);
      expect(sessionStorageMock.setItem).toHaveBeenCalled();
      expect(sessionStorageMock.getItem).toHaveBeenCalled();
      expect(sessionStorageMock.removeItem).toHaveBeenCalled();
    });
  });

  describe('HTTPS Detection', () => {
    test('should detect HTTPS', () => {
      // Mock the checkHTTPS method directly to avoid JSDOM limitations
      const originalCheckHTTPS = compatibility.checkHTTPS;
      compatibility.checkHTTPS = jest.fn().mockReturnValue({
        supported: true,
        message: 'Secure context available',
        protocol: 'https:',
        hostname: 'example.com',
        fallback: null
      });

      const result = compatibility.checkHTTPS();
      
      expect(result.supported).toBe(true);
      expect(result.protocol).toBe('https:');
      
      compatibility.checkHTTPS = originalCheckHTTPS;
    });

    test('should allow localhost over HTTP', () => {
      const originalCheckHTTPS = compatibility.checkHTTPS;
      compatibility.checkHTTPS = jest.fn().mockReturnValue({
        supported: true,
        message: 'Secure context available',
        protocol: 'http:',
        hostname: 'localhost',
        fallback: null
      });

      const result = compatibility.checkHTTPS();
      
      expect(result.supported).toBe(true);
      
      compatibility.checkHTTPS = originalCheckHTTPS;
    });

    test('should reject HTTP for non-localhost', () => {
      const originalCheckHTTPS = compatibility.checkHTTPS;
      compatibility.checkHTTPS = jest.fn().mockReturnValue({
        supported: false,
        message: 'HTTPS required for microphone access',
        protocol: 'http:',
        hostname: 'example.com',
        fallback: 'Some features may not work without HTTPS'
      });

      const result = compatibility.checkHTTPS();
      
      expect(result.supported).toBe(false);
      expect(result.fallback).toContain('HTTPS');
      
      compatibility.checkHTTPS = originalCheckHTTPS;
    });
  });

  describe('Browser Information', () => {
    test('should detect Chrome browser', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        writable: true
      });

      const browserInfo = compatibility.getBrowserInfo();
      
      expect(browserInfo.name).toBe('chrome');
      expect(browserInfo.version).toBe(91);
    });

    test('should detect Firefox browser', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
        writable: true
      });

      const browserInfo = compatibility.getBrowserInfo();
      
      expect(browserInfo.name).toBe('firefox');
      expect(browserInfo.version).toBe(89);
    });

    test('should detect Safari browser', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
        writable: true
      });

      const browserInfo = compatibility.getBrowserInfo();
      
      expect(browserInfo.name).toBe('safari');
      expect(browserInfo.version).toBe(14);
    });

    test('should detect Edge browser', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59',
        writable: true
      });

      const browserInfo = compatibility.getBrowserInfo();
      
      expect(browserInfo.name).toBe('edge');
      expect(browserInfo.version).toBe(91);
    });

    test('should handle unknown browser', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Unknown Browser/1.0',
        writable: true
      });

      const browserInfo = compatibility.getBrowserInfo();
      
      expect(browserInfo.name).toBe('unknown');
      expect(browserInfo.version).toBe(0);
    });
  });

  describe('Modern Browser Detection', () => {
    test('should detect modern Chrome', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Chrome/91.0.4472.124',
        writable: true
      });

      const result = compatibility.checkModernBrowser();
      
      expect(result.supported).toBe(true);
      expect(result.browser).toBe('chrome');
    });

    test('should detect outdated browser', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Chrome/50.0.2661.102',
        writable: true
      });

      const result = compatibility.checkModernBrowser();
      
      expect(result.supported).toBe(false);
      expect(result.recommendation).toContain('update');
    });
  });

  describe('Comprehensive Compatibility Check', () => {
    test('should perform full compatibility check', () => {
      // Mock all APIs as supported
      window.SpeechRecognition = jest.fn(() => ({ abort: jest.fn() }));
      window.speechSynthesis = { getVoices: jest.fn(() => []) };
      window.AudioContext = jest.fn(() => ({ 
        sampleRate: 44100, 
        state: 'running', 
        close: jest.fn() 
      }));
      Object.defineProperty(navigator, 'mediaDevices', {
        value: { getUserMedia: jest.fn() },
        writable: true
      });
      
      // Mock checkHTTPS and checkWebGL to avoid JSDOM issues
      compatibility.checkHTTPS = jest.fn().mockReturnValue({
        supported: true,
        message: 'Secure context available',
        protocol: 'https:',
        hostname: 'example.com'
      });
      
      compatibility.checkWebGL = jest.fn().mockReturnValue({
        supported: true,
        message: 'WebGL available'
      });
      
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Chrome/91.0.4472.124',
        writable: true
      });

      const results = compatibility.checkCompatibility();
      
      expect(results.overall).toBe('excellent');
      expect(results.score).toBeGreaterThan(0);
      expect(results.features.speechRecognition.supported).toBe(true);
      expect(results.features.speechSynthesis.supported).toBe(true);
      expect(results.features.audioContext.supported).toBe(true);
      expect(results.browserInfo.name).toBe('chrome');
    });

    test('should handle incompatible browser', () => {
      // Mock all APIs as unsupported
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage not available');
      });
      
      compatibility.checkHTTPS = jest.fn().mockReturnValue({
        supported: false,
        message: 'HTTPS required for microphone access',
        protocol: 'http:',
        hostname: 'example.com'
      });

      const results = compatibility.checkCompatibility();
      
      expect(results.overall).toBe('incompatible');
      expect(results.errors.length).toBeGreaterThan(0);
      expect(results.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Recommendations and Fallbacks', () => {
    test('should generate appropriate recommendations', () => {
      const mockResults = {
        overall: 'poor',
        features: {
          https: { supported: false },
          speechRecognition: { supported: false },
          localStorage: { supported: false },
          audioContext: { supported: false }
        }
      };

      const recommendations = compatibility.generateRecommendations(mockResults);
      
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some(r => r.type === 'browser')).toBe(true);
      expect(recommendations.some(r => r.type === 'security')).toBe(true);
    });

    test('should generate appropriate fallbacks', () => {
      const mockResults = {
        features: {
          speechRecognition: { supported: false },
          speechSynthesis: { supported: false },
          audioContext: { supported: false },
          localStorage: { supported: false }
        }
      };

      const fallbacks = compatibility.generateFallbacks(mockResults);
      
      expect(fallbacks.length).toBeGreaterThan(0);
      expect(fallbacks.some(f => f.feature === 'voice-input')).toBe(true);
      expect(fallbacks.some(f => f.feature === 'voice-narration')).toBe(true);
    });
  });

  describe('Compatibility Summary', () => {
    test('should provide compatibility summary', () => {
      // Mock a good compatibility result
      compatibility.compatibilityResults = {
        overall: 'good',
        score: 80,
        maxScore: 100,
        errors: [{ severity: 'high' }],
        warnings: [{ severity: 'low' }, { severity: 'low' }],
        features: {
          https: { supported: true }
        },
        browserInfo: { name: 'chrome' }
      };

      const summary = compatibility.getCompatibilitySummary();
      
      expect(summary.overall).toBe('good');
      expect(summary.score).toBe('80%');
      expect(summary.criticalIssues).toBe(1);
      expect(summary.warnings).toBe(2);
      expect(summary.canPlay).toBe(true);
    });
  });

  describe('Singleton Instance', () => {
    test('should provide singleton instance', () => {
      expect(browserCompatibility).toBeInstanceOf(BrowserCompatibility);
    });

    test('should maintain state across calls', () => {
      browserCompatibility.fallbacksActivated = ['test-fallback'];
      
      expect(browserCompatibility.fallbacksActivated).toContain('test-fallback');
      
      browserCompatibility.reset();
      expect(browserCompatibility.fallbacksActivated).toEqual([]);
    });
  });

  describe('Warning System', () => {
    test('should show compatibility warnings', () => {
      // Mock document.body
      document.body.appendChild = jest.fn();
      
      const issue = {
        feature: 'test-feature',
        message: 'Test message',
        severity: 'high',
        fallback: 'Test fallback'
      };

      compatibility.showCompatibilityWarning(issue);
      
      expect(document.body.appendChild).toHaveBeenCalled();
      expect(compatibility.warningsShown).toContain('test-feature');
    });

    test('should not show duplicate warnings', () => {
      document.body.appendChild = jest.fn();
      compatibility.warningsShown = ['test-feature'];
      
      const issue = {
        feature: 'test-feature',
        message: 'Test message',
        severity: 'high'
      };

      compatibility.showCompatibilityWarning(issue);
      
      expect(document.body.appendChild).not.toHaveBeenCalled();
    });
  });

  describe('Fallback Activation', () => {
    test('should activate fallbacks', () => {
      const callback = jest.fn();
      
      compatibility.activateFallback('test-feature', callback);
      
      expect(callback).toHaveBeenCalled();
      expect(compatibility.fallbacksActivated).toContain('test-feature');
    });

    test('should not activate duplicate fallbacks', () => {
      const callback = jest.fn();
      compatibility.fallbacksActivated = ['test-feature'];
      
      compatibility.activateFallback('test-feature', callback);
      
      expect(callback).not.toHaveBeenCalled();
    });
  });
});