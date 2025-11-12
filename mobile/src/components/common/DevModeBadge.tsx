import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { isDevelopmentBuild, isDevModeEnabled } from '../../services/devModeService';

/**
 * DevModeBadge
 *
 * Visual indicator that shows when the app is running in development mode
 * with dev features enabled.
 *
 * Only visible when:
 * 1. Running in development build (__DEV__ = true)
 * 2. Dev mode is enabled in Dev Settings
 */
export default function DevModeBadge() {
  const [showBadge, setShowBadge] = useState(false);

  useEffect(() => {
    checkDevMode();
  }, []);

  const checkDevMode = async () => {
    if (!isDevelopmentBuild()) {
      setShowBadge(false);
      return;
    }

    const devMode = await isDevModeEnabled();
    setShowBadge(devMode);
  };

  if (!showBadge) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.badge}>
        <Text style={styles.emoji}>👨‍💻</Text>
        <Text style={styles.text}>DEV</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    right: 16,
    zIndex: 1000,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF9500',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  emoji: {
    fontSize: 12,
    marginRight: 4,
  },
  text: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
});
