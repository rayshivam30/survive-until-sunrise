/**
 * Inventory - Component for displaying available items and tools
 * Shows inventory items with visual feedback and usage indicators
 */

"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';

const Inventory = ({ 
  className = '', 
  showLabel = true, 
  maxVisible = 6,
  layout = 'horizontal', // 'horizontal', 'vertical', 'grid'
  size = 'medium' // 'small', 'medium', 'large'
}) => {
  const { gameState, gameEngine } = useGame();
  const [inventory, setInventory] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [recentlyAdded, setRecentlyAdded] = useState(new Set());
  const [recentlyUsed, setRecentlyUsed] = useState(new Set());
  
  const inventoryRef = useRef(null);
  const previousInventoryRef = useRef([]);

  // Item type configurations
  const itemTypes = {
    tool: {
      color: '#3b82f6',
      bgColor: 'rgba(59, 130, 246, 0.1)',
      borderColor: 'rgba(59, 130, 246, 0.3)',
      icon: '🔧'
    },
    weapon: {
      color: '#ef4444',
      bgColor: 'rgba(239, 68, 68, 0.1)',
      borderColor: 'rgba(239, 68, 68, 0.3)',
      icon: '⚔️'
    },
    key: {
      color: '#eab308',
      bgColor: 'rgba(234, 179, 8, 0.1)',
      borderColor: 'rgba(234, 179, 8, 0.3)',
      icon: '🗝️'
    },
    consumable: {
      color: '#22c55e',
      bgColor: 'rgba(34, 197, 94, 0.1)',
      borderColor: 'rgba(34, 197, 94, 0.3)',
      icon: '💊'
    },
    light: {
      color: '#f59e0b',
      bgColor: 'rgba(245, 158, 11, 0.1)',
      borderColor: 'rgba(245, 158, 11, 0.3)',
      icon: '🔦'
    },
    document: {
      color: '#8b5cf6',
      bgColor: 'rgba(139, 92, 246, 0.1)',
      borderColor: 'rgba(139, 92, 246, 0.3)',
      icon: '📄'
    },
    misc: {
      color: '#6b7280',
      bgColor: 'rgba(107, 114, 128, 0.1)',
      borderColor: 'rgba(107, 114, 128, 0.3)',
      icon: '📦'
    }
  };

  // Size configurations
  const sizeConfig = {
    small: {
      itemSize: '32px',
      fontSize: '10px',
      padding: '4px',
      gap: '4px'
    },
    medium: {
      itemSize: '40px',
      fontSize: '12px',
      padding: '6px',
      gap: '6px'
    },
    large: {
      itemSize: '48px',
      fontSize: '14px',
      padding: '8px',
      gap: '8px'
    }
  };

  // Update inventory from game state
  useEffect(() => {
    if (!gameState?.inventory) return;

    const currentInventory = gameState.inventory || [];
    const previousInventory = previousInventoryRef.current;
    
    // Detect newly added items
    const newItems = currentInventory.filter(item => 
      !previousInventory.some(prevItem => prevItem.id === item.id)
    );
    
    // Detect recently used items (items that changed state)
    const usedItems = currentInventory.filter(item => {
      const prevItem = previousInventory.find(prevItem => prevItem.id === item.id);
      return prevItem && (
        prevItem.durability !== item.durability ||
        prevItem.isActive !== item.isActive ||
        prevItem.quantity !== item.quantity
      );
    });
    
    // Update recently added items
    if (newItems.length > 0) {
      const newItemIds = new Set(newItems.map(item => item.id));
      setRecentlyAdded(newItemIds);
      
      // Clear recently added after animation
      setTimeout(() => {
        setRecentlyAdded(new Set());
      }, 2000);
    }
    
    // Update recently used items
    if (usedItems.length > 0) {
      const usedItemIds = new Set(usedItems.map(item => item.id));
      setRecentlyUsed(usedItemIds);
      
      // Clear recently used after animation
      setTimeout(() => {
        setRecentlyUsed(new Set());
      }, 1500);
    }
    
    setInventory(currentInventory);
    previousInventoryRef.current = currentInventory;
  }, [gameState?.inventory]);

  // Handle item selection
  const handleItemClick = (item) => {
    setSelectedItem(selectedItem?.id === item.id ? null : item);
    
    // In development mode, log item details
    if (process.env.NODE_ENV === 'development') {
      console.log('Selected item:', item);
    }
  };

  // Handle item usage (if game engine supports it)
  const handleItemUse = (item) => {
    if (gameEngine?.useItem) {
      gameEngine.useItem(item.id);
    }
    setSelectedItem(null);
  };

  // Get item type configuration
  const getItemConfig = (item) => {
    return itemTypes[item.type] || itemTypes.misc;
  };

  // Get current size configuration
  const currentSize = sizeConfig[size];

  // Calculate layout styles
  const getLayoutStyles = () => {
    switch (layout) {
      case 'vertical':
        return {
          flexDirection: 'column',
          alignItems: 'center',
          maxHeight: `${parseInt(currentSize.itemSize) * maxVisible + parseInt(currentSize.gap) * (maxVisible - 1)}px`,
          overflowY: 'auto'
        };
      case 'grid':
        return {
          display: 'grid',
          gridTemplateColumns: `repeat(auto-fit, ${currentSize.itemSize})`,
          gap: currentSize.gap,
          justifyContent: 'center'
        };
      default: // horizontal
        return {
          flexDirection: 'row',
          alignItems: 'center',
          maxWidth: `${parseInt(currentSize.itemSize) * maxVisible + parseInt(currentSize.gap) * (maxVisible - 1)}px`,
          overflowX: 'auto'
        };
    }
  };

  // Render individual inventory item
  const renderItem = (item, index) => {
    const config = getItemConfig(item);
    const isSelected = selectedItem?.id === item.id;
    const isRecentlyAdded = recentlyAdded.has(item.id);
    const isRecentlyUsed = recentlyUsed.has(item.id);
    const isActive = item.isActive;
    const isLowDurability = item.durability !== undefined && item.durability < 20;
    
    return (
      <div
        key={item.id}
        className={`inventory-item ${isSelected ? 'selected' : ''} ${isRecentlyAdded ? 'recently-added' : ''} ${isRecentlyUsed ? 'recently-used' : ''}`}
        onClick={() => handleItemClick(item)}
        onDoubleClick={() => handleItemUse(item)}
        style={{
          width: currentSize.itemSize,
          height: currentSize.itemSize,
          backgroundColor: config.bgColor,
          border: `2px solid ${isSelected ? config.color : config.borderColor}`,
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          position: 'relative',
          transition: 'all 0.3s ease',
          boxShadow: isSelected ? `0 0 15px ${config.color}66` : `0 0 5px ${config.borderColor}`,
          transform: isSelected ? 'scale(1.05)' : 'scale(1)',
          opacity: item.quantity === 0 ? 0.5 : 1
        }}
        title={`${item.name}${item.durability !== undefined ? ` (${item.durability}%)` : ''}${item.quantity !== undefined ? ` x${item.quantity}` : ''}`}
      >
        {/* Item icon */}
        <div
          className="item-icon"
          style={{
            fontSize: `${parseInt(currentSize.fontSize) + 4}px`,
            marginBottom: '2px'
          }}
        >
          {item.icon || config.icon}
        </div>
        
        {/* Item name */}
        <div
          className="item-name"
          style={{
            fontSize: currentSize.fontSize,
            color: config.color,
            textAlign: 'center',
            fontWeight: 'bold',
            textShadow: `0 0 3px ${config.color}`,
            lineHeight: '1',
            maxWidth: '100%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {item.name}
        </div>
        
        {/* Quantity indicator */}
        {item.quantity !== undefined && item.quantity > 1 && (
          <div
            className="quantity-indicator"
            style={{
              position: 'absolute',
              top: '2px',
              right: '2px',
              backgroundColor: config.color,
              color: '#000000',
              borderRadius: '50%',
              width: '16px',
              height: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              fontWeight: 'bold'
            }}
          >
            {item.quantity}
          </div>
        )}
        
        {/* Durability indicator */}
        {item.durability !== undefined && (
          <div
            className="durability-indicator"
            style={{
              position: 'absolute',
              bottom: '2px',
              left: '2px',
              right: '2px',
              height: '3px',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              borderRadius: '2px',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                width: `${item.durability}%`,
                height: '100%',
                backgroundColor: isLowDurability ? '#ef4444' : config.color,
                transition: 'width 0.3s ease'
              }}
            />
          </div>
        )}
        
        {/* Active indicator */}
        {isActive && (
          <div
            className="active-indicator"
            style={{
              position: 'absolute',
              top: '2px',
              left: '2px',
              width: '8px',
              height: '8px',
              backgroundColor: '#22c55e',
              borderRadius: '50%',
              animation: 'activeItemPulse 1s infinite'
            }}
          />
        )}
        
        {/* Low durability warning */}
        {isLowDurability && (
          <div
            className="low-durability-warning"
            style={{
              position: 'absolute',
              top: '-2px',
              right: '-2px',
              color: '#ef4444',
              fontSize: '12px',
              animation: 'lowDurabilityBlink 1s infinite'
            }}
          >
            ⚠️
          </div>
        )}
      </div>
    );
  };

  // Show empty state if no inventory
  if (!inventory || inventory.length === 0) {
    return (
      <div className={`inventory-container empty ${className}`}>
        {showLabel && (
          <div className="inventory-label" style={{ fontSize: currentSize.fontSize, color: '#6b7280', marginBottom: '8px' }}>
            INVENTORY
          </div>
        )}
        <div 
          className="empty-inventory"
          style={{
            padding: currentSize.padding,
            color: '#6b7280',
            fontSize: currentSize.fontSize,
            textAlign: 'center',
            fontStyle: 'italic'
          }}
        >
          No items
        </div>
      </div>
    );
  }

  return (
    <div className={`inventory-container ${className}`}>
      {/* Label */}
      {showLabel && (
        <div 
          className="inventory-label"
          style={{
            fontSize: currentSize.fontSize,
            color: '#00ff00',
            marginBottom: '8px',
            fontWeight: 'bold',
            textShadow: '0 0 8px #00ff00',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <span>INVENTORY</span>
          <span className="item-count" style={{ opacity: 0.7 }}>
            {inventory.length} items
          </span>
        </div>
      )}

      {/* Inventory items */}
      <div
        ref={inventoryRef}
        className="inventory-items"
        style={{
          display: layout === 'grid' ? 'grid' : 'flex',
          gap: currentSize.gap,
          padding: currentSize.padding,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          border: '1px solid rgba(0, 255, 0, 0.3)',
          borderRadius: '8px',
          backdropFilter: 'blur(4px)',
          ...getLayoutStyles()
        }}
      >
        {inventory.slice(0, maxVisible).map(renderItem)}
        
        {/* Show more indicator if items exceed maxVisible */}
        {inventory.length > maxVisible && (
          <div
            className="more-items-indicator"
            style={{
              width: currentSize.itemSize,
              height: currentSize.itemSize,
              backgroundColor: 'rgba(107, 114, 128, 0.1)',
              border: '2px dashed rgba(107, 114, 128, 0.3)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#6b7280',
              fontSize: currentSize.fontSize,
              fontWeight: 'bold'
            }}
          >
            +{inventory.length - maxVisible}
          </div>
        )}
      </div>

      {/* Selected item details */}
      {selectedItem && (
        <div
          className="selected-item-details"
          style={{
            marginTop: '8px',
            padding: '8px',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            border: `1px solid ${getItemConfig(selectedItem).color}`,
            borderRadius: '6px',
            fontSize: currentSize.fontSize
          }}
        >
          <div style={{ color: getItemConfig(selectedItem).color, fontWeight: 'bold', marginBottom: '4px' }}>
            {selectedItem.name}
          </div>
          {selectedItem.description && (
            <div style={{ color: '#cccccc', fontSize: `${parseInt(currentSize.fontSize) - 1}px`, marginBottom: '4px' }}>
              {selectedItem.description}
            </div>
          )}
          <div style={{ color: '#999999', fontSize: `${parseInt(currentSize.fontSize) - 1}px` }}>
            Type: {selectedItem.type}
            {selectedItem.durability !== undefined && ` • Durability: ${selectedItem.durability}%`}
            {selectedItem.quantity !== undefined && ` • Quantity: ${selectedItem.quantity}`}
          </div>
        </div>
      )}

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes activeItemPulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        @keyframes lowDurabilityBlink {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.3;
          }
        }

        .inventory-item.recently-added {
          animation: itemAdded 2s ease-out;
        }

        .inventory-item.recently-used {
          animation: itemUsed 1.5s ease-out;
        }

        @keyframes itemAdded {
          0% {
            transform: scale(0.8);
            opacity: 0;
          }
          50% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes itemUsed {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
            box-shadow: 0 0 20px #00ff00aa;
          }
        }

        .inventory-items::-webkit-scrollbar {
          width: 4px;
          height: 4px;
        }

        .inventory-items::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.3);
        }

        .inventory-items::-webkit-scrollbar-thumb {
          background: rgba(0, 255, 0, 0.5);
          border-radius: 2px;
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .inventory-container {
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  );
};

export default Inventory;