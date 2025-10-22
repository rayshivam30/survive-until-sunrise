/**
 * Unit tests for HUD components
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock the GameContext
const mockGameContext = {
  gameState: {
    currentTime: '23:30',
    fearLevel: 45,
    health: 75,
    inventory: [
      { id: '1', name: 'Flashlight', type: 'light', durability: 80, isActive: true },
      { id: '2', name: 'Key', type: 'key', quantity: 1 }
    ],
    gameStarted: true,
    isAlive: true,
    isListening: false
  },
  gameEngine: {
    gameTimer: {
      getTimeUntilSunrise: () => ({
        hours: 6,
        minutes: 30,
        totalMinutes: 390,
        percentage: 45
      })
    }
  }
};

// Mock Web APIs
Object.defineProperty(window, 'speechSynthesis', {
  writable: true,
  value: { speak: jest.fn(), cancel: jest.fn(), getVoices: jest.fn(() => []) }
});

Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: { getUserMedia: jest.fn(() => Promise.resolve({ getTracks: () => [] })) }
});

// Mock the useGame hook
jest.mock('../../context/GameContext', () => ({
  useGame: () => mockGameContext
}));

// Import components
import Timer from '../Timer';
import FearMeter from '../FearMeter';
import HealthBar from '../HealthBar';
import Inventory from '../Inventory';
import VoiceIndicator from '../VoiceIndicator';
import HUD from '../HUD';

describe('HUD Components', () => {
  test('Timer renders current time', () => {
    render(<Timer />);
    expect(screen.getByText('23:30')).toBeInTheDocument();
  });

  test('FearMeter renders fear level', () => {
    render(<FearMeter showPercentage={true} />);
    expect(screen.getByText('45%')).toBeInTheDocument();
  });

  test('HealthBar renders health level', () => {
    render(<HealthBar showValue={true} />);
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  test('Inventory renders items', () => {
    render(<Inventory showLabel={true} />);
    expect(screen.getByText('INVENTORY')).toBeInTheDocument();
    expect(screen.getByText('Flashlight')).toBeInTheDocument();
  });

  test('VoiceIndicator renders status', () => {
    render(<VoiceIndicator showLabel={true} />);
    expect(screen.getByText('Disconnected')).toBeInTheDocument();
  });

  test('HUD renders all components', () => {
    render(<HUD layout="default" />);
    expect(screen.getByText('23:30')).toBeInTheDocument();
    expect(screen.getByText('FEAR')).toBeInTheDocument();
    expect(screen.getByText('HEALTH')).toBeInTheDocument();
    expect(screen.getByText('INVENTORY')).toBeInTheDocument();
  });
});