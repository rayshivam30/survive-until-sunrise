import '@testing-library/jest-dom'

// Mock performance.now for tests
global.performance = global.performance || {
  now: jest.fn(() => Date.now()),
}

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 0))

// Mock setTimeout for testing
global.setTimeout = jest.fn((fn, delay) => {
  return 1 // Return a fake timer ID
})

// Mock console methods to reduce test noise
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}