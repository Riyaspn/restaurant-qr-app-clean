//components/GlobalKotDisplay.js

import React, { useState } from 'react';
import { useKot } from '../context/KotContext';
import KotPrint from './KotPrint';

export default function GlobalKotDisplay() {
  const { kotQueue, removeKotFromQueue, markKotAsPrinted, isWebApp } = useKot();
  const [currentKotIndex, setCurrentKotIndex] = useState(0);

  // Only show on web app
  if (!isWebApp || kotQueue.length === 0) {
    return null;
  }

  const currentKot = kotQueue[currentKotIndex];
  const totalKots = kotQueue.length;

  const handlePrint = () => {
    markKotAsPrinted(currentKot.id);
    handleNext();
  };

  const handleNext = () => {
    if (currentKotIndex < totalKots - 1) {
      setCurrentKotIndex(prev => prev + 1);
    } else {
      // Remove all printed KOTs and reset
      kotQueue.forEach(kot => {
        if (kot.printed) {
          removeKotFromQueue(kot.id);
        }
      });
      setCurrentKotIndex(0);
    }
  };

  const handleClose = () => {
    // Don't allow closing - make it persistent
    // Could show a warning instead
    alert('Please print the KOT before closing. Kitchen needs this order!');
  };

  return (
    <div className="global-kot-overlay">
      <div className="kot-queue-info">
        <div className="queue-header">
          <span className="queue-position">
            KOT {currentKotIndex + 1} of {totalKots}
          </span>
          <div className="queue-indicators">
            {kotQueue.map((_, index) => (
              <div
                key={index}
                className={`indicator ${
                  index === currentKotIndex ? 'active' : 
                  index < currentKotIndex ? 'completed' : 'pending'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <KotPrint
        order={currentKot.order}
        onClose={handleClose}
        onPrint={handlePrint}
        isPersistent={true}
        queueInfo={{
          current: currentKotIndex + 1,
          total: totalKots
        }}
      />

      <style jsx>{`
        .global-kot-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 10000;
          pointer-events: none;
        }

        .kot-queue-info {
          position: absolute;
          top: 20px;
          right: 20px;
          background: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 12px 16px;
          border-radius: 8px;
          font-size: 14px;
          pointer-events: auto;
          z-index: 10001;
        }

        .queue-header {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .queue-indicators {
          display: flex;
          gap: 4px;
        }

        .indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #666;
        }

        .indicator.active {
          background: #10b981;
          box-shadow: 0 0 8px #10b981;
        }

        .indicator.completed {
          background: #059669;
        }

        .indicator.pending {
          background: #374151;
        }
      `}</style>
    </div>
  );
}
