/**
 * EndingScreen - Displays game ending results, statistics, and restart options
 * Shows ending-specific content, achievements, and provides restart functionality
 */

import React, { useState, useEffect } from 'react';

const EndingScreen = ({ 
  endingResult, 
  onRestart, 
  onViewAchievements, 
  isVisible = false 
}) => {
  const [showStatistics, setShowStatistics] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [animationPhase, setAnimationPhase] = useState('hidden');

  useEffect(() => {
    if (isVisible && endingResult) {
      // Animate in the ending screen
      setAnimationPhase('entering');
      setTimeout(() => setAnimationPhase('visible'), 100);
    } else {
      setAnimationPhase('hidden');
    }
  }, [isVisible, endingResult]);

  if (!isVisible || !endingResult) {
    return null;
  }

  const { ending, content, achievements } = endingResult;

  const getRarityColor = (rarity) => {
    const colors = {
      common: 'text-gray-400',
      uncommon: 'text-green-400',
      rare: 'text-blue-400',
      legendary: 'text-purple-400'
    };
    return colors[rarity] || 'text-gray-400';
  };

  const getRarityBorder = (rarity) => {
    const borders = {
      common: 'border-gray-400',
      uncommon: 'border-green-400',
      rare: 'border-blue-400',
      legendary: 'border-purple-400'
    };
    return borders[rarity] || 'border-gray-400';
  };

  const handleRestart = () => {
    setAnimationPhase('exiting');
    setTimeout(() => {
      if (onRestart) {
        onRestart();
      }
    }, 300);
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black transition-opacity duration-500 ${
      animationPhase === 'visible' ? 'bg-opacity-90' : 'bg-opacity-0'
    }`}>
      <div className={`max-w-4xl w-full mx-4 bg-gray-900 rounded-lg border-2 ${getRarityBorder(ending.rarity)} shadow-2xl transform transition-all duration-500 ${
        animationPhase === 'visible' ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
      }`}>
        
        {/* Header */}
        <div className="p-6 border-b border-gray-700">
          <div className="text-center">
            <h1 className={`text-4xl font-bold mb-2 ${getRarityColor(ending.rarity)}`}>
              {ending.title}
            </h1>
            <p className="text-gray-300 text-lg mb-2">
              {ending.description}
            </p>
            <div className="flex items-center justify-center space-x-4">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                ending.type === 'victory' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
              }`}>
                {ending.type === 'victory' ? 'Victory' : 'Defeat'}
              </span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium bg-gray-800 ${getRarityColor(ending.rarity)}`}>
                {ending.rarity.charAt(0).toUpperCase() + ending.rarity.slice(1)}
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Narration */}
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-white mb-3">Your Story</h3>
            <p className="text-gray-300 leading-relaxed text-lg">
              {content.narration}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4 mb-6">
            <button
              onClick={() => setShowStatistics(!showStatistics)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200"
            >
              {showStatistics ? 'Hide' : 'Show'} Statistics
            </button>
            
            <button
              onClick={() => setShowAchievements(!showAchievements)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors duration-200"
            >
              {showAchievements ? 'Hide' : 'Show'} Achievements
            </button>
            
            {onViewAchievements && (
              <button
                onClick={onViewAchievements}
                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors duration-200"
              >
                View All Achievements
              </button>
            )}
          </div>

          {/* Statistics Panel */}
          {showStatistics && (
            <div className="mb-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
              <h3 className="text-xl font-semibold text-white mb-3">Game Statistics</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(content.statistics).map(([key, value]) => (
                  <div key={key} className="text-center">
                    <div className="text-2xl font-bold text-blue-400">{value}</div>
                    <div className="text-sm text-gray-400">{key}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Achievements Panel */}
          {showAchievements && achievements && (
            <div className="mb-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
              <h3 className="text-xl font-semibold text-white mb-3">
                Achievements ({achievements.achieved}/{achievements.total})
              </h3>
              
              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-400 mb-1">
                  <span>Progress</span>
                  <span>{achievements.percentage}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-1000"
                    style={{ width: `${achievements.percentage}%` }}
                  ></div>
                </div>
              </div>

              {achievements.recent && achievements.recent.length > 0 && (
                <div>
                  <h4 className="text-lg font-medium text-white mb-2">Recent Achievements</h4>
                  <div className="space-y-2">
                    {achievements.recent.map((achievement, index) => (
                      <div key={achievement.id} className="flex items-center justify-between p-2 bg-gray-700 rounded">
                        <div>
                          <div className={`font-medium ${getRarityColor(achievement.rarity)}`}>
                            {achievement.title}
                          </div>
                          <div className="text-sm text-gray-400">
                            {achievement.description}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          {achievement.timesAchieved}x
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {achievements.rarest && (
                <div className="mt-4 p-3 bg-gradient-to-r from-purple-900 to-blue-900 rounded-lg">
                  <h4 className="text-lg font-medium text-white mb-1">Rarest Achievement</h4>
                  <div className={`font-medium ${getRarityColor(achievements.rarest.rarity)}`}>
                    {achievements.rarest.title}
                  </div>
                  <div className="text-sm text-gray-300">
                    {achievements.rarest.description}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700 flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={handleRestart}
            className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors duration-200 transform hover:scale-105"
          >
            Play Again
          </button>
          
          <button
            onClick={() => window.location.reload()}
            className="px-8 py-3 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors duration-200"
          >
            Main Menu
          </button>
        </div>
      </div>
    </div>
  );
};

export default EndingScreen;