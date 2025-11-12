/**
 * Feature Disabled Banner
 * 
 * Shows when a feature is disabled on current network.
 * Used for mainnet rollout with kill-switch.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export interface FeatureDisabledBannerProps {
  /** Reason why feature is disabled */
  reason: string;
  
  /** Optional action button */
  actionLabel?: string;
  onAction?: () => void;
  
  /** Style variant */
  variant?: 'warning' | 'error' | 'info';
}

export const FeatureDisabledBanner: React.FC<FeatureDisabledBannerProps> = ({
  reason,
  actionLabel,
  onAction,
  variant = 'warning',
}) => {
  const backgroundColor = {
    warning: '#FFF3CD',
    error: '#F8D7DA',
    info: '#D1ECF1',
  }[variant];
  
  const textColor = {
    warning: '#856404',
    error: '#721C24',
    info: '#0C5460',
  }[variant];
  
  const icon = {
    warning: '⚠️',
    error: '🔴',
    info: 'ℹ️',
  }[variant];
  
  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={styles.content}>
        <Text style={styles.icon}>{icon}</Text>
        
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: textColor }]}>
            Feature Not Available
          </Text>
          
          <Text style={[styles.reason, { color: textColor }]}>
            {reason}
          </Text>
        </View>
      </View>
      
      {actionLabel && onAction && (
        <TouchableOpacity
          style={[styles.actionButton, { borderColor: textColor }]}
          onPress={onAction}
        >
          <Text style={[styles.actionLabel, { color: textColor }]}>
            {actionLabel}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  icon: {
    fontSize: 24,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  reason: {
    fontSize: 14,
    lineHeight: 20,
  },
  actionButton: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
});

/**
 * Compact version for inline display
 */
export const FeatureDisabledInline: React.FC<{
  reason: string;
}> = ({ reason }) => {
  return (
    <View style={inlineStyles.container}>
      <Text style={inlineStyles.icon}>🔒</Text>
      <Text style={inlineStyles.text}>{reason}</Text>
    </View>
  );
};

const inlineStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 6,
    marginVertical: 8,
  },
  icon: {
    fontSize: 16,
    marginRight: 8,
  },
  text: {
    flex: 1,
    fontSize: 14,
    color: '#6C757D',
  },
});
