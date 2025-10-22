/**
 * FearHealthFeedback - Handles visual and audio feedback for fear and health changes
 * Provides real-time feedback through visual effects and audio cues
 */

import React, { useEffect, useRef, useState } from 'react';

export const FearHealthFeedback = ({ 
  gameEngine, 
  audioManager, 
  voiceNarrator,
  isVisible = true 
}) => {
  const [fearState, setFearState] = useState('calm');
  const [healthState, setHealthState] = useState('excellent');
  const [feedbackQueue, setFeedbackQueue] = useState([]);
  const [activeEffects, setActiveEffects] = useState(new Set());
  
  const fearIndicatorRef = useRef(null);
  const healthIndicatorRef = useRef(null);
  const screenOverlayRef = useRef(null);
  const lastFeedbackTime = useRef(0);

  // Fear state colors and effects
  const fearStateConfig = {
    calm: { 
      color: '#4ade80', 
      pulse: false, 
      intensity: 0,
      screenTint: 'rgba(0, 0, 0, 0)'
    },
    nervous: { 
      color: '#facc15', 
      pulse: true, 
      intensity: 0.2,
      screenTint: 'rgba(255, 255, 0, 0.05)'
    },
    scared: { 
      color: '#f97316', 
      pulse: true, 
      intensity: 0.4,
      screenTint: 'rgba(255, 165, 0, 0.1)'
    },
    terrified: { 
      color: '#ef4444', 
      pulse: true, 
      intensity: 0.6,
      screenTint: 'rgba(255, 0, 0, 0.15)'
    },
    panicked: { 
      color: '#dc2626', 
      pulse: true, 
      intensity: 0.8,
      screenTint: 'rgba(255, 0, 0, 0.2)'
    },
    overwhelmed: { 
      color: '#991b1b', 
      pulse: true, 
      intensity: 1.0,
      screenTint: 'rgba(139, 0, 0, 0.3)'
    }
  };

  // Health state colors and effects
  const healthStateConfig = {
    excellent: { color: '#22c55e', pulse: false, warning: false },
    good: { color: '#84cc16', pulse: false, warning: false },
    injured: { color: '#eab308', pulse: false, warning: false },
    wounded: { color: '#f97316', pulse: true, warning: true },
    critical: { color: '#ef4444', pulse: true, warning: true },
    dying: { color: '#991b1b', pulse: true, warning: true }
  };

  // Audio feedback configuration
  const audioFeedback = {
    fear: {
      nervous: { sound: 'heartbeat_slow', volume: 0.3 },
      scared: { sound: 'heartbeat_medium', volume: 0.5 },
      terrified: { sound: 'heartbeat_fast', volume: 0.7 },
      panicked: { sound: 'panic_breathing', volume: 0.8 },
      overwhelmed: { sound: 'terror_scream', volume: 0.9 }
    },
    health: {
      wounded: { sound: 'pain_grunt', volume: 0.6 },
      critical: { sound: 'critical_alarm', volume: 0.8 },
      dying: { sound: 'death_rattle', volume: 1.0 }
    }
  };

  // Voice feedback messages
  const voiceFeedback = {
    fear: {
      nervous: ["I'm starting to feel uneasy...", "Something doesn't feel right..."],
      scared: ["My heart is racing...", "I need to be careful..."],
      terrified: ["I can barely think straight...", "This is getting too intense..."],
      panicked: ["I can't control my fear...", "Everything is terrifying..."],
      overwhelmed: ["I can't take much more of this...", "The fear is overwhelming..."]
    },
    health: {
      injured: ["I'm hurt, but I can keep going...", "That stings, but I'll manage..."],
      wounded: ["I'm bleeding... this is serious...", "I need to be more careful..."],
      critical: ["I'm badly hurt... I might not make it...", "Every movement is agony..."],
      dying: ["I'm dying... I can feel it...", "This might be the end..."]
    }
  };

  useEffect(() => {
    if (!gameEngine) return;

    const fearSystem = gameEngine.getFearSystem();
    const healthSystem = gameEngine.getHealthSystem();

    // Set up fear change callbacks
    const unsubscribeFear = fearSystem.onFearChange((changeType, data, fearLevel, newFearState) => {
      setFearState(newFearState);
      
      // Add visual feedback
      addFeedback('fear', changeType, {
        level: fearLevel,
        state: newFearState,
        data: data
      });

      // Trigger audio feedback
      triggerAudioFeedback('fear', newFearState, changeType);

      // Trigger voice feedback for significant changes
      if (changeType === 'state' && shouldTriggerVoiceFeedback('fear', newFearState)) {
        triggerVoiceFeedback('fear', newFearState);
      }
    });

    // Set up health change callbacks
    const unsubscribeHealth = healthSystem.onHealthChange((changeType, data, healthLevel, newHealthState) => {
      setHealthState(newHealthState);
      
      // Add visual feedback
      addFeedback('health', changeType, {
        level: healthLevel,
        state: newHealthState,
        data: data
      });

      // Trigger audio feedback
      triggerAudioFeedback('health', newHealthState, changeType);

      // Trigger voice feedback for significant changes
      if (changeType === 'damage' && shouldTriggerVoiceFeedback('health', newHealthState)) {
        triggerVoiceFeedback('health', newHealthState);
      }
    });

    return () => {
      unsubscribeFear();
      unsubscribeHealth();
    };
  }, [gameEngine]);

  // Add feedback to queue
  const addFeedback = (type, changeType, data) => {
    const feedback = {
      id: `${type}_${Date.now()}`,
      type: type,
      changeType: changeType,
      data: data,
      timestamp: Date.now()
    };

    setFeedbackQueue(prev => [...prev.slice(-4), feedback]); // Keep last 5 items

    // Add visual effect
    setActiveEffects(prev => new Set([...prev, feedback.id]));

    // Remove effect after duration
    setTimeout(() => {
      setActiveEffects(prev => {
        const newSet = new Set(prev);
        newSet.delete(feedback.id);
        return newSet;
      });
    }, 2000);
  };

  // Trigger audio feedback
  const triggerAudioFeedback = (type, state, changeType) => {
    if (!audioManager) return;

    const config = audioFeedback[type]?.[state];
    if (config && changeType === 'state') {
      try {
        audioManager.playEffect(config.sound, { volume: config.volume });
      } catch (error) {
        console.warn('Failed to play audio feedback:', error);
      }
    }

    // Special audio for damage events
    if (type === 'health' && changeType === 'damage') {
      try {
        audioManager.playEffect('damage_sound', { volume: 0.7 });
      } catch (error) {
        console.warn('Failed to play damage sound:', error);
      }
    }
  };

  // Check if voice feedback should be triggered
  const shouldTriggerVoiceFeedback = (type, state) => {
    const now = Date.now();
    const timeSinceLastFeedback = now - lastFeedbackTime.current;
    
    // Minimum 10 seconds between voice feedback
    if (timeSinceLastFeedback < 10000) return false;

    // Only trigger for significant states
    const significantStates = {
      fear: ['terrified', 'panicked', 'overwhelmed'],
      health: ['wounded', 'critical', 'dying']
    };

    return significantStates[type]?.includes(state);
  };

  // Trigger voice feedback
  const triggerVoiceFeedback = (type, state) => {
    if (!voiceNarrator) return;

    const messages = voiceFeedback[type]?.[state];
    if (messages && messages.length > 0) {
      const randomMessage = messages[Math.floor(Math.random() * messages.length)];
      
      try {
        voiceNarrator.speak(randomMessage, { 
          priority: 'high',
          interrupt: false 
        });
        lastFeedbackTime.current = Date.now();
      } catch (error) {
        console.warn('Failed to play voice feedback:', error);
      }
    }
  };

  // Apply screen effects based on fear state
  useEffect(() => {
    if (!screenOverlayRef.current) return;

    const config = fearStateConfig[fearState];
    if (config) {
      screenOverlayRef.current.style.backgroundColor = config.screenTint;
      
      if (config.pulse && config.intensity > 0.5) {
        screenOverlayRef.current.style.animation = `fearPulse ${2 - config.intensity}s infinite`;
      } else {
        screenOverlayRef.current.style.animation = 'none';
      }
    }
  }, [fearState]);

  if (!isVisible) return null;

  return (
    <div className="fear-health-feedback">
      {/* Screen overlay for fear effects */}
      <div 
        ref={screenOverlayRef}
        className="screen-overlay"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'none',
          zIndex: 1000,
          transition: 'background-color 0.5s ease'
        }}
      />

      {/* Fear indicator */}
      <div 
        ref={fearIndicatorRef}
        className={`fear-indicator ${fearState}`}
        style={{
          position: 'fixed',
          top: '20px',
          left: '20px',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          backgroundColor: fearStateConfig[fearState]?.color || '#4ade80',
          border: '3px solid rgba(255, 255, 255, 0.3)',
          boxShadow: `0 0 20px ${fearStateConfig[fearState]?.color || '#4ade80'}`,
          animation: fearStateConfig[fearState]?.pulse ? 'fearPulse 1.5s infinite' : 'none',
          zIndex: 1001
        }}
      >
        <div 
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: 'white',
            fontSize: '12px',
            fontWeight: 'bold',
            textAlign: 'center'
          }}
        >
          FEAR
        </div>
      </div>

      {/* Health indicator */}
      <div 
        ref={healthIndicatorRef}
        className={`health-indicator ${healthState}`}
        style={{
          position: 'fixed',
          top: '20px',
          left: '100px',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          backgroundColor: healthStateConfig[healthState]?.color || '#22c55e',
          border: '3px solid rgba(255, 255, 255, 0.3)',
          boxShadow: `0 0 20px ${healthStateConfig[healthState]?.color || '#22c55e'}`,
          animation: healthStateConfig[healthState]?.pulse ? 'healthPulse 1s infinite' : 'none',
          zIndex: 1001
        }}
      >
        <div 
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: 'white',
            fontSize: '12px',
            fontWeight: 'bold',
            textAlign: 'center'
          }}
        >
          HP
        </div>
      </div>

      {/* Feedback messages */}
      <div 
        className="feedback-messages"
        style={{
          position: 'fixed',
          bottom: '100px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1001
        }}
      >
        {feedbackQueue.slice(-3).map((feedback) => (
          <div
            key={feedback.id}
            className={`feedback-message ${feedback.type} ${activeEffects.has(feedback.id) ? 'active' : 'fade'}`}
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              color: feedback.type === 'fear' ? fearStateConfig[feedback.data.state]?.color : healthStateConfig[feedback.data.state]?.color,
              padding: '8px 16px',
              borderRadius: '20px',
              margin: '4px 0',
              fontSize: '14px',
              fontWeight: 'bold',
              textAlign: 'center',
              animation: activeEffects.has(feedback.id) ? 'feedbackSlideIn 0.3s ease-out' : 'feedbackFadeOut 0.5s ease-out',
              opacity: activeEffects.has(feedback.id) ? 1 : 0
            }}
          >
            {feedback.type === 'fear' ? `Fear: ${feedback.data.state}` : `Health: ${feedback.data.state}`}
          </div>
        ))}
      </div>

      {/* CSS animations */}
      <style jsx>{`
        @keyframes fearPulse {
          0%, 100% { 
            transform: scale(1); 
            opacity: 0.8; 
          }
          50% { 
            transform: scale(1.1); 
            opacity: 1; 
          }
        }

        @keyframes healthPulse {
          0%, 100% { 
            transform: scale(1); 
            opacity: 0.9; 
          }
          50% { 
            transform: scale(1.05); 
            opacity: 1; 
          }
        }

        @keyframes feedbackSlideIn {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes feedbackFadeOut {
          from {
            opacity: 1;
          }
          to {
            opacity: 0;
          }
        }

        .screen-overlay {
          transition: background-color 0.5s ease;
        }
      `}</style>
    </div>
  );
};

export default FearHealthFeedback;