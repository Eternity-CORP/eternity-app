/**
 * Error Display Component
 * 
 * Shows user-friendly error messages with:
 * - Error title and description
 * - Severity indicator
 * - Actionable buttons (CTA)
 * - Technical details (collapsible)
 * - Retry history
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import type { MappedError, ErrorAction } from '../utils/errorMapper';
import { getActionLabel, getActionIcon } from '../utils/errorMapper';
import type { RetryHistory } from '../config/txPolicy';
import { formatRetryDelay } from '../config/txPolicy';

// ============================================================================
// Types
// ============================================================================

interface Props {
  error: MappedError;
  retryHistory?: RetryHistory;
  onAction?: (action: ErrorAction) => void;
  locale?: string;
  showTechnicalDetails?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function ErrorDisplay({
  error,
  retryHistory,
  onAction,
  locale = 'en',
  showTechnicalDetails = false,
}: Props) {
  const [showDetails, setShowDetails] = useState(showTechnicalDetails);

  const severityColor = getSeverityColor(error.severity);
  const severityIcon = getSeverityIcon(error.severity);

  return (
    <View style={styles.container}>
      {/* Error Header */}
      <View style={[styles.header, { backgroundColor: severityColor.bg }]}>
        <Text style={styles.icon}>{severityIcon}</Text>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: severityColor.text }]}>
            {error.title}
          </Text>
          <Text style={[styles.message, { color: severityColor.text }]}>
            {error.message}
          </Text>
        </View>
      </View>

      {/* Retry History */}
      {retryHistory && retryHistory.totalAttempts > 0 && (
        <View style={styles.retryHistory}>
          <Text style={styles.retryHistoryTitle}>
            Retry History ({retryHistory.totalAttempts} attempts)
          </Text>
          {retryHistory.lastAttempt && (
            <View style={styles.retryAttempt}>
              <Text style={styles.retryAttemptText}>
                Last attempt: {new Date(retryHistory.lastAttempt.timestamp).toLocaleString()}
              </Text>
              <Text style={styles.retryAttemptText}>
                Error: {retryHistory.lastAttempt.errorCode}
              </Text>
              {retryHistory.nextRetryAt && (
                <Text style={styles.retryAttemptText}>
                  Next retry: {formatRetryDelay(retryHistory.nextRetryAt - Date.now())}
                </Text>
              )}
            </View>
          )}
        </View>
      )}

      {/* Actions */}
      {error.actions.length > 0 && (
        <View style={styles.actions}>
          {error.actions.map((action) => (
            <TouchableOpacity
              key={action}
              style={[
                styles.actionButton,
                action === error.actions[0] && styles.actionButtonPrimary,
              ]}
              onPress={() => onAction?.(action)}
            >
              <Text style={styles.actionIcon}>{getActionIcon(action)}</Text>
              <Text
                style={[
                  styles.actionText,
                  action === error.actions[0] && styles.actionTextPrimary,
                ]}
              >
                {getActionLabel(action, locale)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Technical Details */}
      {error.technicalDetails && (
        <View style={styles.technicalSection}>
          <TouchableOpacity
            style={styles.technicalToggle}
            onPress={() => setShowDetails(!showDetails)}
          >
            <Text style={styles.technicalToggleText}>
              {showDetails ? '▼' : '▶'} Technical Details
            </Text>
          </TouchableOpacity>
          {showDetails && (
            <ScrollView style={styles.technicalDetails} horizontal>
              <Text style={styles.technicalDetailsText}>
                {error.technicalDetails}
              </Text>
            </ScrollView>
          )}
        </View>
      )}

      {/* Error Code */}
      <View style={styles.footer}>
        <Text style={styles.errorCode}>Error Code: {error.code}</Text>
        {error.retryable && (
          <Text style={styles.retryable}>✓ Retryable</Text>
        )}
      </View>
    </View>
  );
}

// ============================================================================
// Compact Error Display (for lists)
// ============================================================================

interface CompactProps {
  error: MappedError;
  onPress?: () => void;
}

export function CompactErrorDisplay({ error, onPress }: CompactProps) {
  const severityColor = getSeverityColor(error.severity);
  const severityIcon = getSeverityIcon(error.severity);

  return (
    <TouchableOpacity
      style={[styles.compactContainer, { borderLeftColor: severityColor.border }]}
      onPress={onPress}
    >
      <Text style={styles.compactIcon}>{severityIcon}</Text>
      <View style={styles.compactContent}>
        <Text style={styles.compactTitle}>{error.title}</Text>
        <Text style={styles.compactMessage} numberOfLines={2}>
          {error.message}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function getSeverityColor(severity: 'error' | 'warning' | 'info') {
  switch (severity) {
    case 'error':
      return {
        bg: '#F8D7DA',
        text: '#721C24',
        border: '#F5C6CB',
      };
    case 'warning':
      return {
        bg: '#FFF3CD',
        text: '#856404',
        border: '#FFE69C',
      };
    case 'info':
      return {
        bg: '#E3F2FF',
        text: '#007AFF',
        border: '#B3D9FF',
      };
  }
}

function getSeverityIcon(severity: 'error' | 'warning' | 'info'): string {
  switch (severity) {
    case 'error':
      return '❌';
    case 'warning':
      return '⚠️';
    case 'info':
      return 'ℹ️';
  }
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    overflow: 'hidden',
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'flex-start',
  },
  icon: {
    fontSize: 24,
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
  },
  retryHistory: {
    padding: 16,
    backgroundColor: '#F2F2F7',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  retryHistoryTitle: {
    fontSize: 10,
    fontWeight: '500',
    color: '#8E8E93',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  retryAttempt: {
    padding: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
  },
  retryAttemptText: {
    fontSize: 11,
    color: '#000000',
    marginBottom: 2,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#F2F2F7',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  actionButtonPrimary: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  actionIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  actionText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#000000',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  actionTextPrimary: {
    color: '#FFFFFF',
  },
  technicalSection: {
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  technicalToggle: {
    padding: 12,
  },
  technicalToggleText: {
    fontSize: 10,
    color: '#8E8E93',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  technicalDetails: {
    maxHeight: 100,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  technicalDetailsText: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#000000',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F2F2F7',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  errorCode: {
    fontSize: 10,
    color: '#8E8E93',
    fontFamily: 'monospace',
  },
  retryable: {
    fontSize: 10,
    color: '#34C759',
    fontWeight: '600',
  },
  // Compact styles
  compactContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    borderLeftWidth: 3,
    marginVertical: 4,
  },
  compactIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  compactContent: {
    flex: 1,
  },
  compactTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 2,
  },
  compactMessage: {
    fontSize: 12,
    color: '#8E8E93',
    lineHeight: 16,
  },
});
