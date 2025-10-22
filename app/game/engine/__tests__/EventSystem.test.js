/**
 * EventSystem Tests
 */

import EventSystem from '../EventSystem.js';

// Mock dependencies
const mockGameState = {
  currentTime: '23:30',
  fearLevel: 25,
  health: 100,
  inventory: [],
  updateFear: jest.fn(),
  updateHealth: jest.fn(),
  addToInventory: jest.fn()
};

const mockAudioManager = {
  playEffect: jest.fn()
};

const mockVoiceController = {
  speak: jest.fn()
};

describe('EventSystem', () => {
  let eventSystem;

  beforeEach(() => {
    eventSystem = new EventSystem(mockGameState, mockAudioManager, mockVoiceController);
    jest.clearAllMocks();
  });

  describe('Event Generation', () => {
    test('should generate events based on time and fear level', () => {
      const event = eventSystem.generateRandomEvent();
      
      if (event) {
        expect(event).toHaveProperty('id');
        expect(event).toHaveProperty('type');
        expect(event).toHaveProperty('content');
      }
    });

    test('should respect event cooldown', () => {
      eventSystem.lastEventTime = Date.now();
      const event = eventSystem.generateRandomEvent();
      expect(event).toBeNull();
    });

    test('should not generate events outside time range', () => {
      mockGameState.currentTime = '10:00'; // Daytime
      const event = eventSystem.generateRandomEvent();
      expect(event).toBeNull();
    });

    test('should not generate events below fear threshold', () => {
      mockGameState.fearLevel = 0;
      mockGameState.currentTime = '02:00';
      
      // Try multiple times since generation is probabilistic
      let highFearEvent = null;
      for (let i = 0; i < 50; i++) {
        const event = eventSystem.generateRandomEvent();
        if (event && event.trigger.fearThreshold > 30) {
          highFearEvent = event;
          break;
        }
        eventSystem.lastEventTime = null; // Reset cooldown
      }
      
      expect(highFearEvent).toBeNull();
    });
  });

  describe('Time Range Checking', () => {
    test('should correctly handle overnight time ranges', () => {
      expect(eventSystem.isTimeInRange('23:30', ['23:00', '05:00'])).toBe(true);
      expect(eventSystem.isTimeInRange('02:00', ['23:00', '05:00'])).toBe(true);
      expect(eventSystem.isTimeInRange('10:00', ['23:00', '05:00'])).toBe(false);
    });

    test('should correctly handle same-day time ranges', () => {
      expect(eventSystem.isTimeInRange('14:00', ['12:00', '16:00'])).toBe(true);
      expect(eventSystem.isTimeInRange('10:00', ['12:00', '16:00'])).toBe(false);
      expect(eventSystem.isTimeInRange('18:00', ['12:00', '16:00'])).toBe(false);
    });
  });

  describe('Event Processing', () => {
    test('should process ambient events immediately', () => {
      const ambientEvent = {
        id: 'test_ambient',
        type: 'ambient',
        content: {
          narration: 'Test narration',
          audioFile: 'test_sound'
        },
        consequences: {
          fearDelta: 10,
          healthDelta: -5
        }
      };

      eventSystem.processEvent(ambientEvent);

      expect(mockAudioManager.playEffect).toHaveBeenCalledWith('test_sound');
      expect(mockVoiceController.speak).toHaveBeenCalledWith('Test narration');
      expect(mockGameState.updateFear).toHaveBeenCalledWith(10);
      expect(mockGameState.updateHealth).toHaveBeenCalledWith(-5);
    });

    test('should queue threat events for player response', () => {
      const threatEvent = {
        id: 'test_threat',
        type: 'threat',
        content: {
          narration: 'A threat appears',
          audioFile: 'threat_sound'
        },
        responses: [
          {
            command: 'hide',
            outcome: { fearDelta: -5 }
          }
        ]
      };

      eventSystem.processEvent(threatEvent);

      expect(eventSystem.eventQueue).toHaveLength(1);
      expect(eventSystem.eventQueue[0].awaitingResponse).toBe(true);
    });
  });

  describe('Player Response Evaluation', () => {
    test('should correctly match player commands to event responses', () => {
      const event = {
        id: 'test_event',
        responses: [
          {
            command: 'hide',
            outcome: {
              fearDelta: -10,
              narration: 'You hide successfully'
            }
          },
          {
            command: 'run',
            outcome: {
              fearDelta: 5,
              narration: 'You run away'
            }
          }
        ]
      };

      const response = eventSystem.evaluatePlayerResponse('hide behind the door', event);

      expect(response).toBeTruthy();
      expect(response.command).toBe('hide');
      expect(mockGameState.updateFear).toHaveBeenCalledWith(-10);
      expect(mockVoiceController.speak).toHaveBeenCalledWith('You hide successfully');
    });

    test('should handle item gains from responses', () => {
      const event = {
        id: 'discovery_event',
        responses: [
          {
            command: 'take',
            outcome: {
              itemGained: 'flashlight',
              narration: 'You picked up a flashlight'
            }
          }
        ]
      };

      eventSystem.evaluatePlayerResponse('take flashlight', event);

      expect(mockGameState.addToInventory).toHaveBeenCalledWith('flashlight');
    });

    test('should return null for unmatched commands', () => {
      const event = {
        id: 'test_event',
        responses: [
          { command: 'hide', outcome: {} }
        ]
      };

      const response = eventSystem.evaluatePlayerResponse('dance', event);
      expect(response).toBeNull();
    });
  });

  describe('Event Timeouts', () => {
    test('should handle event timeouts correctly', () => {
      const event = {
        id: 'timeout_test',
        startTime: Date.now() - 20000, // 20 seconds ago
        awaitingResponse: true,
        processed: false,
        consequences: {
          timeout: {
            fearDelta: 15,
            narration: 'You waited too long'
          }
        }
      };

      eventSystem.eventQueue.push(event);
      eventSystem.handleEventTimeouts();

      expect(mockGameState.updateFear).toHaveBeenCalledWith(15);
      expect(mockVoiceController.speak).toHaveBeenCalledWith('You waited too long');
      expect(event.processed).toBe(true);
      expect(event.awaitingResponse).toBe(false);
    });

    test('should not timeout events within time limit', () => {
      const event = {
        id: 'no_timeout_test',
        startTime: Date.now() - 5000, // 5 seconds ago
        awaitingResponse: true,
        processed: false,
        consequences: {
          timeout: { fearDelta: 15 }
        }
      };

      eventSystem.eventQueue.push(event);
      eventSystem.handleEventTimeouts();

      expect(mockGameState.updateFear).not.toHaveBeenCalled();
      expect(event.processed).toBe(false);
    });
  });

  describe('Event History', () => {
    test('should track event history', () => {
      const event = eventSystem.generateRandomEvent();
      if (event) {
        expect(eventSystem.eventHistory).toContainEqual(
          expect.objectContaining({
            id: event.id,
            triggeredAt: expect.any(Number),
            gameTime: mockGameState.currentTime,
            fearLevelAtTrigger: mockGameState.fearLevel
          })
        );
      }
    });

    test('should prevent duplicate events in short timeframe', () => {
      // Force a specific event
      const testEvent = eventSystem.eventConfig.ambient[0];
      eventSystem.eventHistory.push({
        ...testEvent,
        triggeredAt: Date.now() - 60000 // 1 minute ago
      });

      const eligible = eventSystem.isEventEligible(
        testEvent,
        mockGameState.currentTime,
        mockGameState.fearLevel
      );

      expect(eligible).toBe(false);
    });

    test('should clear history on reset', () => {
      eventSystem.eventHistory.push({ id: 'test' });
      eventSystem.eventQueue.push({ id: 'test' });
      
      eventSystem.clearEventHistory();
      
      expect(eventSystem.eventHistory).toHaveLength(0);
      expect(eventSystem.eventQueue).toHaveLength(0);
      expect(eventSystem.lastEventTime).toBeNull();
    });
  });

  describe('Active Events', () => {
    test('should return only active events awaiting response', () => {
      eventSystem.eventQueue.push(
        { id: 'active1', awaitingResponse: true, processed: false },
        { id: 'processed', awaitingResponse: false, processed: true },
        { id: 'active2', awaitingResponse: true, processed: false }
      );

      const activeEvents = eventSystem.getActiveEvents();
      expect(activeEvents).toHaveLength(2);
      expect(activeEvents.map(e => e.id)).toEqual(['active1', 'active2']);
    });
  });

  describe('Update Loop', () => {
    test('should handle timeouts and potentially generate events', () => {
      const handleTimeoutsSpy = jest.spyOn(eventSystem, 'handleEventTimeouts');
      const generateEventSpy = jest.spyOn(eventSystem, 'generateRandomEvent');
      
      // Mock Math.random to ensure event generation attempt
      const originalRandom = Math.random;
      Math.random = jest.fn(() => 0.05); // Less than 0.1 threshold

      eventSystem.update();

      expect(handleTimeoutsSpy).toHaveBeenCalled();
      expect(generateEventSpy).toHaveBeenCalled();

      // Restore Math.random
      Math.random = originalRandom;
    });
  });

  describe('Probability-based Event Selection', () => {
    test('should select events based on probability weights', () => {
      const events = [
        { trigger: { probability: 0.1 } },
        { trigger: { probability: 0.3 } },
        { trigger: { probability: 0.6 } }
      ];

      // Mock Math.random to select middle event
      const originalRandom = Math.random;
      Math.random = jest.fn(() => 0.25); // Should select second event

      const selected = eventSystem.selectEventByProbability(events);
      expect(selected).toBe(events[1]);

      Math.random = originalRandom;
    });
  });
});