import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

interface GhostModeContextType {
  isGhostMode: boolean;
  toggleGhostMode: () => void;
  enableGhostMode: () => void;
  disableGhostMode: () => void;
}

const GHOST_MODE_KEY = '@ghost_mode_enabled';

export const GhostModeContext = createContext<GhostModeContextType | null>(null);

export const GhostModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isGhostMode, setIsGhostMode] = useState(false);

  useEffect(() => {
    loadGhostModeState();
  }, []);

  const loadGhostModeState = async () => {
    try {
      const stored = await AsyncStorage.getItem(GHOST_MODE_KEY);
      if (stored !== null) {
        setIsGhostMode(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load ghost mode state:', error);
    }
  };

  const toggleGhostMode = useCallback(async () => {
    const newState = !isGhostMode;
    setIsGhostMode(newState);
    await AsyncStorage.setItem(GHOST_MODE_KEY, JSON.stringify(newState));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [isGhostMode]);

  const enableGhostMode = useCallback(async () => {
    setIsGhostMode(true);
    await AsyncStorage.setItem(GHOST_MODE_KEY, JSON.stringify(true));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const disableGhostMode = useCallback(async () => {
    setIsGhostMode(false);
    await AsyncStorage.setItem(GHOST_MODE_KEY, JSON.stringify(false));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  return (
    <GhostModeContext.Provider value={{ isGhostMode, toggleGhostMode, enableGhostMode, disableGhostMode }}>
      {children}
    </GhostModeContext.Provider>
  );
};

export const useGhostMode = (): GhostModeContextType => {
  const context = useContext(GhostModeContext);
  if (!context) {
    throw new Error('useGhostMode must be used within GhostModeProvider');
  }
  return context;
};
