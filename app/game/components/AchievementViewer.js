/**
 * AchievementViewer - Displays all possible achievements and their unlock status
 * Shows achievement progress, rarity, and detailed information
 */

import React, { useState, useEffect } from 'react';

const AchievementViewer = ({ 
  endingSystem, 
  isVisible = false, 
  onClose 
}) => {
  const [achievements, setAchievements] = useState({});
  const [allEndings, setAllEndings] = useState({});
  const [filter, setFilter] = useState('all'); // all, unlocked, locked, victory, death
  const [sortBy, setSortBy] = useState('rarity'); // rarity, name, unlock_date

  useEffect(() => {
    if (isVisible && endingSystem) {
      loadAchievementData();
    }
  }, [isVisible, endingSystem]);

  const loadAchievementData = () => {
    try {
      const achievementSummary = endingSystem.getAchievementSummary();
      const allEndingsData = endingSystem.getAllEndings();
      
      setAchievements(endingSystem.endingAchievements || {});
      setAllEndings(allEndingsData);
    } catch (error) {
      console.error('Error loading achievement data:', error);
    }
  };

  if (!isVisible) {
    return null;
  }

  const getRarityColor = (rarity) => {
    const colors = {
      common: 'text-gray-400',
      uncommon: 'text-green-400',
      rare: 'text-blue-400',
      legendary: 'text-purple-400'
    };
    return colors[rarity] || 'text-gray-400';
  };

  const getRarityBg = (rarity) => {
    const backgrounds = {
      common: 'bg-gray-800',
      uncommon: 'bg-green-900',
      rare: 'bg-blue-900',
      legendary: 'bg-purple-900'
    };
    return backgrounds[rarity] || 'bg-gray-800';
  };

  const getRarityBorder = (rarity) => {
    const borders = {
      common: 'border-gray-600',
      uncommon: 'border-green-500',
      rare: 'border-blue-500',
      legendary: 'border-purple-500'
    };
    return borders[rarity] || 'border-gray-600';
  };

  // Flatten all endings into a single array
  const getAllEndingsList = () => {
    const endingsList = [];
    
    Object.entries(allEndings).forEach(([category, endings]) => {
      Object.entries(endings).forEach(([id, ending]) => {
        const achievement = achievements[id];
        endingsList.push({
          id,
          category,
          ...ending,
          isUnlocked: !!achievement,
          timesAchieved: achievement?.timesAchieved || 0,
          firstAchieved: achievement?.firstAchieved,
          lastAchieved: achievement?.lastAchieved
        });
      });
    });
    
    return endingsList;
  };

  // Filter and sort endings
  const getFilteredEndings = () => {
    let filtered = getAllEndingsList();
    
    // Apply filters
    switch (filter) {
      case 'unlocked':
        filtered = filtered.filter(ending => ending.isUnlocked);
        break;
      case 'locked':
        filtered = filtered.filter(ending => !ending.isUnlocked);
        break;
      case 'victory':
        filtered = filtered.filter(ending => ending.type === 'victory');
        break;
      case 'death':
        filtered = filtered.filter(ending => ending.type === 'death');
        break;
      default:
        // 'all' - no filtering
        break;
    }
    
    // Apply sorting
    switch (sortBy) {
      case 'name':
        filtered.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'unlock_date':
        filtered.sort((a, b) => {
          if (!a.isUnlocked && !b.isUnlocked) return 0;
          if (!a.isUnlocked) return 1;
          if (!b.isUnlocked) return -1;
          return b.lastAchieved - a.lastAchieved;
        });
        break;
      case 'rarity':
      default:
        const rarityOrder = { legendary: 4, rare: 3, uncommon: 2, common: 1 };
        filtered.sort((a, b) => rarityOrder[b.rarity] - rarityOrder[a.rarity]);
        break;
    }
    
    return filtered;
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleDateString();
  };

  const getUnlockPercentage = () => {
    const total = getAllEndingsList().length;
    const unlocked = getAllEndingsList().filter(e => e.isUnlocked).length;
    return total > 0 ? Math.round((unlocked / total) * 100) : 0;
  };

  const filteredEndings = getFilteredEndings();
  const unlockPercentage = getUnlockPercentage();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90">
      <div className="max-w-6xl w-full h-full max-h-screen mx-4 bg-gray-900 rounded-lg border border-gray-700 shadow-2xl flex flex-col">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-700 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-white">Achievement Gallery</h1>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl font-bold"
            >
              ×
            </button>
          </div>
          
          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-400 mb-1">
              <span>Overall Progress</span>
              <span>{unlockPercentage}% Complete</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-blue-600 to-purple-600 h-3 rounded-full transition-all duration-1000"
                style={{ width: `${unlockPercentage}%` }}
              ></div>
            </div>
          </div>

          {/* Filters and Sorting */}
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-400">Filter:</label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="bg-gray-800 text-white border border-gray-600 rounded px-3 py-1 text-sm"
              >
                <option value="all">All</option>
                <option value="unlocked">Unlocked</option>
                <option value="locked">Locked</option>
                <option value="victory">Victory</option>
                <option value="death">Death</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-400">Sort by:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-gray-800 text-white border border-gray-600 rounded px-3 py-1 text-sm"
              >
                <option value="rarity">Rarity</option>
                <option value="name">Name</option>
                <option value="unlock_date">Unlock Date</option>
              </select>
            </div>
          </div>
        </div>

        {/* Achievement Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEndings.map((ending) => (
              <div
                key={ending.id}
                className={`p-4 rounded-lg border-2 transition-all duration-200 hover:scale-105 ${
                  ending.isUnlocked 
                    ? `${getRarityBg(ending.rarity)} ${getRarityBorder(ending.rarity)}` 
                    : 'bg-gray-800 border-gray-600 opacity-60'
                }`}
              >
                {/* Achievement Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className={`font-bold text-lg ${
                      ending.isUnlocked ? getRarityColor(ending.rarity) : 'text-gray-500'
                    }`}>
                      {ending.isUnlocked ? ending.title : '???'}
                    </h3>
                    <p className="text-sm text-gray-400">
                      {ending.isUnlocked ? ending.description : 'Achievement locked'}
                    </p>
                  </div>
                  
                  <div className="flex flex-col items-end">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      ending.type === 'victory' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
                    }`}>
                      {ending.type}
                    </span>
                    <span className={`mt-1 px-2 py-1 rounded text-xs font-medium bg-gray-700 ${
                      ending.isUnlocked ? getRarityColor(ending.rarity) : 'text-gray-500'
                    }`}>
                      {ending.rarity}
                    </span>
                  </div>
                </div>

                {/* Achievement Stats */}
                {ending.isUnlocked && (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Times Achieved:</span>
                      <span className="text-white font-medium">{ending.timesAchieved}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">First Unlocked:</span>
                      <span className="text-white">{formatDate(ending.firstAchieved)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Last Achieved:</span>
                      <span className="text-white">{formatDate(ending.lastAchieved)}</span>
                    </div>
                  </div>
                )}

                {/* Locked Achievement Hint */}
                {!ending.isUnlocked && (
                  <div className="mt-3 p-2 bg-gray-700 rounded text-xs text-gray-400">
                    Complete specific actions during gameplay to unlock this achievement.
                  </div>
                )}
              </div>
            ))}
          </div>

          {filteredEndings.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 text-lg">No achievements match your current filter.</div>
              <button
                onClick={() => setFilter('all')}
                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200"
              >
                Show All Achievements
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700 flex-shrink-0">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-400">
              {filteredEndings.filter(e => e.isUnlocked).length} of {filteredEndings.length} shown achievements unlocked
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors duration-200"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AchievementViewer;