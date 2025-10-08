//context/KotContext.js

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

const KotContext = createContext();

export const useKot = () => {
  const context = useContext(KotContext);
  if (!context) {
    throw new Error('useKot must be used within a KotProvider');
  }
  return context;
};

export const KotProvider = ({ children }) => {
  const [kotQueue, setKotQueue] = useState([]);
  const [isWebApp, setIsWebApp] = useState(true);

  // Detect platform
  useEffect(() => {
    const platform = Capacitor.getPlatform();
    setIsWebApp(platform === 'web');
  }, []);

  // Load persisted KOTs from localStorage on mount
  useEffect(() => {
    try {
      const savedKots = localStorage.getItem('pending_kots');
      if (savedKots) {
        const parsed = JSON.parse(savedKots);
        if (Array.isArray(parsed)) {
          setKotQueue(parsed);
        }
      }
    } catch (error) {
      console.error('Error loading persisted KOTs:', error);
    }
  }, []);

  // Persist KOTs to localStorage whenever queue changes
  useEffect(() => {
    try {
      localStorage.setItem('pending_kots', JSON.stringify(kotQueue));
    } catch (error) {
      console.error('Error persisting KOTs:', error);
    }
  }, [kotQueue]);

  const addKotToQueue = (order) => {
    // Only show KOT popups for web app
    if (!isWebApp) {
      // For native apps, auto-print directly
      console.log('Native app: Auto-printing KOT for order:', order.id);
      // Here you would integrate with native printing
      return;
    }

    const newKot = {
      id: `kot_${order.id}_${Date.now()}`,
      order,
      timestamp: Date.now(),
      printed: false
    };

    setKotQueue(prev => [...prev, newKot]);
  };

  const removeKotFromQueue = (kotId) => {
    setKotQueue(prev => prev.filter(kot => kot.id !== kotId));
  };

  const markKotAsPrinted = (kotId) => {
    setKotQueue(prev => 
      prev.map(kot => 
        kot.id === kotId 
          ? { ...kot, printed: true }
          : kot
      )
    );
  };

  const clearAllKots = () => {
    setKotQueue([]);
  };

  return (
    <KotContext.Provider value={{
      kotQueue,
      isWebApp,
      addKotToQueue,
      removeKotFromQueue,
      markKotAsPrinted,
      clearAllKots
    }}>
      {children}
    </KotContext.Provider>
  );
};
