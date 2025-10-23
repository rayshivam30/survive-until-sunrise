"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useGame } from '../context/GameContext';

const GameWorld = () => {
  const { gameState, isGameRunning, handleCommand } = useGame();
  
  // Game world state
  const [player, setPlayer] = useState({ x: 5, y: 5, facing: 'north' });
  const [monsters, setMonsters] = useState([
    { id: 1, x: 12, y: 8, type: 'ghost', lastSeen: 0, hunting: false },
    { id: 2, x: 3, y: 12, type: 'shadow', lastSeen: 0, hunting: false }
  ]);
  const [rooms, setRooms] = useState([
    { id: 'living_room', x: 4, y: 4, width: 4, height: 4, name: 'Living Room', items: ['flashlight'] },
    { id: 'kitchen', x: 9, y: 4, width: 3, height: 3, name: 'Kitchen', items: ['knife'] },
    { id: 'bedroom', x: 4, y: 9, width: 3, height: 3, name: 'Bedroom', items: ['phone'] },
    { id: 'basement', x: 9, y: 9, width: 4, height: 4, name: 'Basement', items: ['key'] }
  ]);
  const [gameTime, setGameTime] = useState(0);
  const [isHiding, setIsHiding] = useState(false);
  const [lastPlayerMove, setLastPlayerMove] = useState(0);
  
  const gameLoopRef = useRef();
  const WORLD_WIDTH = 16;
  const WORLD_HEIGHT = 16;
  const CELL_SIZE = 30;

  // Game loop
  useEffect(() => {
    if (!isGameRunning) return;

    const gameLoop = () => {
      setGameTime(prev => prev + 1);
      updateMonsters();
      checkCollisions();
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);
    
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [isGameRunning]);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (!isGameRunning) return;
      
      const now = Date.now();
      if (now - lastPlayerMove < 200) return; // Prevent too fast movement
      
      let newX = player.x;
      let newY = player.y;
      let newFacing = player.facing;

      switch (e.key.toLowerCase()) {
        case 'w':
        case 'arrowup':
          newY = Math.max(0, player.y - 1);
          newFacing = 'north';
          break;
        case 's':
        case 'arrowdown':
          newY = Math.min(WORLD_HEIGHT - 1, player.y + 1);
          newFacing = 'south';
          break;
        case 'a':
        case 'arrowleft':
          newX = Math.max(0, player.x - 1);
          newFacing = 'west';
          break;
        case 'd':
        case 'arrowright':
          newX = Math.min(WORLD_WIDTH - 1, player.x + 1);
          newFacing = 'east';
          break;
        case ' ':
          e.preventDefault();
          toggleHide();
          return;
        case 'f':
          useFlashlight();
          return;
        case 'e':
          interactWithRoom();
          return;
      }

      if (newX !== player.x || newY !== player.y) {
        setPlayer(prev => ({ ...prev, x: newX, y: newY, facing: newFacing }));
        setLastPlayerMove(now);
        
        // Movement makes noise and can attract monsters
        if (!isHiding) {
          alertMonsters(newX, newY);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [player, isGameRunning, isHiding, lastPlayerMove]);

  const updateMonsters = useCallback(() => {
    setMonsters(prev => prev.map(monster => {
      let newX = monster.x;
      let newY = monster.y;
      let hunting = monster.hunting;

      // Monster AI
      if (hunting || Math.random() < 0.1) {
        // Move towards player if hunting or randomly
        const dx = player.x - monster.x;
        const dy = player.y - monster.y;
        
        if (Math.abs(dx) > Math.abs(dy)) {
          newX += dx > 0 ? 1 : -1;
        } else {
          newY += dy > 0 ? 1 : -1;
        }

        // Keep monsters in bounds
        newX = Math.max(0, Math.min(WORLD_WIDTH - 1, newX));
        newY = Math.max(0, Math.min(WORLD_HEIGHT - 1, newY));

        // Stop hunting if too far from player
        const distance = Math.abs(player.x - newX) + Math.abs(player.y - newY);
        if (distance > 8) {
          hunting = false;
        }
      }

      return { ...monster, x: newX, y: newY, hunting };
    }));
  }, [player.x, player.y]);

  const checkCollisions = useCallback(() => {
    monsters.forEach(monster => {
      const distance = Math.abs(monster.x - player.x) + Math.abs(monster.y - player.y);
      
      if (monster.x === player.x && monster.y === player.y && !isHiding) {
        // Player caught by monster!
        handleCommand('caught by monster');
      } else if (distance <= 2 && !isHiding) {
        // Monster is very close - increase fear
        if (Math.random() < 0.1) { // 10% chance per frame
          handleCommand('monster nearby');
        }
      }
    });
  }, [monsters, player, isHiding, handleCommand]);

  const alertMonsters = useCallback((x, y) => {
    setMonsters(prev => prev.map(monster => {
      const distance = Math.abs(monster.x - x) + Math.abs(monster.y - y);
      if (distance < 5) {
        return { ...monster, hunting: true, lastSeen: gameTime };
      }
      return monster;
    }));
  }, [gameTime]);

  const toggleHide = () => {
    const inRoom = getCurrentRoom();
    if (inRoom) {
      setIsHiding(!isHiding);
      handleCommand(isHiding ? 'stop hiding' : 'hide');
    }
  };

  const useFlashlight = () => {
    handleCommand('use flashlight');
  };

  const interactWithRoom = () => {
    const room = getCurrentRoom();
    if (room && room.items.length > 0) {
      const item = room.items[0];
      handleCommand(`pick up ${item}`);
      // Remove item from room
      setRooms(prev => prev.map(r => 
        r.id === room.id ? { ...r, items: r.items.filter(i => i !== item) } : r
      ));
    }
  };

  const getCurrentRoom = () => {
    return rooms.find(room => 
      player.x >= room.x && player.x < room.x + room.width &&
      player.y >= room.y && player.y < room.y + room.height
    );
  };

  const isLightOn = () => {
    return gameState?.inventory?.some(item => 
      item.id === 'flashlight' && item.isActive && item.durability > 0
    );
  };

  const getVisibilityRadius = () => {
    if (isLightOn()) return 4;
    if (gameState?.inventory?.some(item => item.id === 'phone' && item.isActive)) return 2;
    return 1;
  };

  const isVisible = (x, y) => {
    const distance = Math.abs(player.x - x) + Math.abs(player.y - y);
    return distance <= getVisibilityRadius();
  };

  const getCellContent = (x, y) => {
    // Player
    if (x === player.x && y === player.y) {
      if (isHiding) return { type: 'player_hiding', char: '🫥', color: '#666' };
      return { type: 'player', char: '🧍', color: '#00ff00' };
    }

    // Monsters (only if visible)
    if (isVisible(x, y)) {
      const monster = monsters.find(m => m.x === x && m.y === y);
      if (monster) {
        const char = monster.type === 'ghost' ? '👻' : '👤';
        const color = monster.hunting ? '#ff0000' : '#ff6600';
        return { type: 'monster', char, color };
      }
    }

    // Rooms
    const room = rooms.find(r => 
      x >= r.x && x < r.x + r.width && y >= r.y && y < r.y + r.height
    );
    if (room) {
      // Room items
      if (room.items.length > 0 && isVisible(x, y)) {
        const item = room.items[0];
        const itemChars = {
          flashlight: '🔦',
          knife: '🔪',
          phone: '📱',
          key: '🗝️'
        };
        return { type: 'item', char: itemChars[item] || '📦', color: '#ffff00' };
      }
      
      // Room walls
      if (x === room.x || x === room.x + room.width - 1 || 
          y === room.y || y === room.y + room.height - 1) {
        return { type: 'wall', char: '▓', color: '#444' };
      }
      
      // Room floor
      return { type: 'floor', char: '·', color: '#222' };
    }

    // Empty space
    return { type: 'empty', char: isVisible(x, y) ? '·' : ' ', color: '#111' };
  };

  const currentRoom = getCurrentRoom();

  return (
    <div className="game-world p-4">
      {/* Game Status */}
      <div className="mb-4 p-3 bg-black bg-opacity-50 border border-green-400 rounded">
        <div className="text-green-400 text-sm font-mono">
          <div>Position: ({player.x}, {player.y}) | Facing: {player.facing}</div>
          <div>Room: {currentRoom ? currentRoom.name : 'Hallway'}</div>
          <div>Status: {isHiding ? '🫥 Hiding' : '👁️ Visible'}</div>
          <div>Light: {isLightOn() ? '🔦 On' : '🌑 Dark'} | Visibility: {getVisibilityRadius()} tiles</div>
        </div>
      </div>

      {/* Game World Grid */}
      <div 
        className="game-grid border border-green-400 bg-black"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${WORLD_WIDTH}, ${CELL_SIZE}px)`,
          gridTemplateRows: `repeat(${WORLD_HEIGHT}, ${CELL_SIZE}px)`,
          gap: '1px',
          width: 'fit-content',
          margin: '0 auto'
        }}
      >
        {Array.from({ length: WORLD_HEIGHT }, (_, y) =>
          Array.from({ length: WORLD_WIDTH }, (_, x) => {
            const content = getCellContent(x, y);
            const isPlayerCell = x === player.x && y === player.y;
            
            const cellClasses = [
              'game-cell',
              isPlayerCell ? 'player-cell' : '',
              content.type === 'monster' ? 'monster-cell' : '',
              content.type === 'item' ? 'item-cell' : '',
              content.type === 'floor' ? 'room-cell' : ''
            ].filter(Boolean).join(' ');

            return (
              <div
                key={`${x}-${y}`}
                className={cellClasses}
                style={{
                  width: `${CELL_SIZE}px`,
                  height: `${CELL_SIZE}px`,
                  backgroundColor: content.type === 'empty' ? '#000' : 
                                 content.type === 'floor' ? '#1a1a1a' :
                                 content.type === 'wall' ? '#333' : '#111',
                  color: content.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  border: isPlayerCell ? '2px solid #00ff00' : '1px solid #333',
                  position: 'relative'
                }}
              >
                {content.char}
              </div>
            );
          })
        )}
      </div>

      {/* Controls */}
      <div className="mt-4 p-3 bg-black bg-opacity-50 border border-green-400 rounded">
        <div className="text-green-400 text-sm font-mono">
          <div className="mb-2 font-bold">CONTROLS:</div>
          <div>🎮 WASD / Arrow Keys: Move</div>
          <div>🫥 SPACE: Hide (only in rooms)</div>
          <div>🔦 F: Toggle Flashlight</div>
          <div>📦 E: Interact / Pick up items</div>
          <div className="mt-2 text-yellow-400">
            💡 Stay hidden when monsters are near! Light helps you see but may attract them.
          </div>
        </div>
      </div>

      {/* Monster Status */}
      <div className="mt-4 p-3 bg-red-900 bg-opacity-30 border border-red-400 rounded">
        <div className="text-red-400 text-sm font-mono">
          <div className="mb-2 font-bold">👻 MONSTERS:</div>
          {monsters.map(monster => (
            <div key={monster.id}>
              {monster.type === 'ghost' ? '👻' : '👤'} {monster.type} at ({monster.x}, {monster.y}) - 
              {monster.hunting ? ' 🔴 HUNTING!' : ' 🟡 Wandering'}
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .game-cell {
          transition: all 0.2s ease;
        }
        .player-cell {
          animation: playerPulse 2s infinite;
        }
        @keyframes playerPulse {
          0%, 100% { box-shadow: 0 0 5px #00ff00; }
          50% { box-shadow: 0 0 15px #00ff00; }
        }
      `}</style>
    </div>
  );
};

export default GameWorld;