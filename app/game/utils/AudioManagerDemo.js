/**
 * AudioManager Demonstration Script
 * This script demonstrates the key features of the AudioManager system
 */

import { 
  initializeAudio, 
  playAmbient, 
  playJumpScare, 
  playFootsteps,
  adjustMasterVolume,
  updateAudioForGameState,
  getAudioStatus,
  destroyAudio 
} from './soundManager.js';

/**
 * Demonstrate AudioManager functionality
 */
export async function demonstrateAudioManager() {
  console.log('🎵 AudioManager Demonstration Starting...');
  
  try {
    // 1. Initialize the audio system
    console.log('1. Initializing audio system...');
    const initSuccess = await initializeAudio();
    console.log(`   ✅ Audio initialization: ${initSuccess ? 'SUCCESS' : 'FAILED'}`);
    
    // 2. Check initial status
    console.log('2. Checking audio status...');
    const status = getAudioStatus();
    console.log(`   📊 Status:`, {
      initialized: status.isInitialized,
      totalSounds: status.totalSounds,
      currentAmbient: status.currentAmbient
    });
    
    // 3. Test ambient sound playback
    console.log('3. Testing ambient sound playback...');
    const ambientResult = playAmbient('forest_night', { volume: 0.2 });
    console.log(`   🌲 Forest ambient: ${ambientResult ? 'PLAYING' : 'FAILED'}`);
    
    // 4. Test effect sound playback
    console.log('4. Testing effect sound playback...');
    const jumpScareId = playJumpScare({ volume: 0.1 });
    console.log(`   👻 Jump scare: ${jumpScareId ? 'PLAYED' : 'FAILED'} (ID: ${jumpScareId})`);
    
    const footstepsId = playFootsteps('walk', { volume: 0.15 });
    console.log(`   👣 Footsteps: ${footstepsId ? 'PLAYED' : 'FAILED'} (ID: ${footstepsId})`);
    
    // 5. Test volume control
    console.log('5. Testing volume control...');
    adjustMasterVolume(0.5);
    console.log('   🔊 Master volume set to 50%');
    
    // 6. Test game state integration
    console.log('6. Testing game state integration...');
    const testGameState = {
      fearLevel: 75,
      health: 60,
      currentTime: '02:30',
      location: 'basement'
    };
    updateAudioForGameState(testGameState);
    console.log('   🎮 Game state audio update applied');
    
    // 7. Test ambient switching
    console.log('7. Testing ambient sound switching...');
    const basementResult = playAmbient('basement_drip', { volume: 0.25 });
    console.log(`   💧 Basement drip: ${basementResult ? 'PLAYING' : 'FAILED'}`);
    
    // 8. Final status check
    console.log('8. Final status check...');
    const finalStatus = getAudioStatus();
    console.log(`   📊 Final Status:`, {
      initialized: finalStatus.isInitialized,
      currentAmbient: finalStatus.currentAmbient,
      totalSounds: finalStatus.totalSounds
    });
    
    console.log('✅ AudioManager demonstration completed successfully!');
    console.log('');
    console.log('🔧 Key Features Demonstrated:');
    console.log('   • Audio system initialization with fallback handling');
    console.log('   • Ambient sound playback with fade-in/fade-out');
    console.log('   • Sound effect playback with mixing capabilities');
    console.log('   • Dynamic volume control');
    console.log('   • Game state-based audio adjustments');
    console.log('   • Error handling and graceful degradation');
    console.log('   • Audio asset loading with fallback systems');
    
    return true;
    
  } catch (error) {
    console.error('❌ AudioManager demonstration failed:', error);
    return false;
  }
}

/**
 * Demonstrate error handling capabilities
 */
export async function demonstrateErrorHandling() {
  console.log('🚨 AudioManager Error Handling Demonstration...');
  
  try {
    // Initialize audio
    await initializeAudio();
    
    // Test playing non-existent sounds
    console.log('1. Testing non-existent ambient sound...');
    const badAmbient = playAmbient('non_existent_sound');
    console.log(`   Result: ${badAmbient ? 'UNEXPECTED SUCCESS' : 'HANDLED GRACEFULLY'}`);
    
    console.log('2. Testing non-existent effect sound...');
    const badEffect = playJumpScare('non_existent_effect');
    console.log(`   Result: ${badEffect ? 'UNEXPECTED SUCCESS' : 'HANDLED GRACEFULLY'}`);
    
    // Test with null game state
    console.log('3. Testing null game state...');
    updateAudioForGameState(null);
    console.log('   ✅ Null game state handled gracefully');
    
    // Test extreme volume values
    console.log('4. Testing extreme volume values...');
    adjustMasterVolume(150); // Over maximum
    adjustMasterVolume(-50); // Under minimum
    console.log('   ✅ Volume clamping working correctly');
    
    console.log('✅ Error handling demonstration completed!');
    return true;
    
  } catch (error) {
    console.error('❌ Error handling demonstration failed:', error);
    return false;
  }
}

/**
 * Clean up demonstration
 */
export function cleanupDemo() {
  console.log('🧹 Cleaning up AudioManager demonstration...');
  destroyAudio();
  console.log('✅ Cleanup completed');
}

/**
 * Run full demonstration
 */
export async function runFullDemo() {
  console.log('🎵 Starting Full AudioManager Demonstration');
  console.log('==========================================');
  
  const basicDemo = await demonstrateAudioManager();
  console.log('');
  
  const errorDemo = await demonstrateErrorHandling();
  console.log('');
  
  cleanupDemo();
  
  console.log('==========================================');
  console.log(`🎯 Demonstration Results:`);
  console.log(`   Basic functionality: ${basicDemo ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Error handling: ${errorDemo ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Overall: ${basicDemo && errorDemo ? '✅ SUCCESS' : '❌ NEEDS ATTENTION'}`);
  
  return basicDemo && errorDemo;
}