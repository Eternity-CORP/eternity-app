import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { router } from 'expo-router';

import { TokenFoundNotification, TokenFoundBadge } from '@/src/components/TokenFoundNotification';
import { SuggestionBannerList } from '@/src/components/ai';
import type { Tier2TokenBalance } from '@/src/services/smart-scanning-service';
import type { AiSuggestion } from '@/src/services/ai-service';
import { theme } from '@/src/constants/theme';

interface BannerSectionProps {
  isTestAccount: boolean;
  pendingSplitsCount: number;
  firstSplitId: string | undefined;
  scheduledPendingCount: number;
  visibleAlerts: Tier2TokenBalance[];
  scanningTotalUsdValue: number;
  showAllScanningAlerts: boolean;
  onShowAllScanningAlerts: () => void;
  onBridgeToken: (balance: Tier2TokenBalance, destinationNetwork: string) => void;
  onDismissAlert: (networkId: string, tokenSymbol: string) => void;
  onSnoozeAlert: (networkId: string, tokenSymbol: string) => void;
  aiSuggestions: AiSuggestion[];
  onDismissSuggestion: (id: string) => void;
}

export function BannerSection({
  isTestAccount,
  pendingSplitsCount,
  firstSplitId,
  scheduledPendingCount,
  visibleAlerts,
  scanningTotalUsdValue,
  showAllScanningAlerts,
  onShowAllScanningAlerts,
  onBridgeToken,
  onDismissAlert,
  onSnoozeAlert,
  aiSuggestions,
  onDismissSuggestion,
}: BannerSectionProps) {
  return (
    <>
      {/* Testnet Warning Banner */}
      {isTestAccount && (
        <View style={styles.testnetBanner}>
          <FontAwesome name="exclamation-triangle" size={14} color="#fbbf24" />
          <View style={styles.testnetBannerText}>
            <Text style={styles.testnetTitle}>Testnet Account (Sepolia)</Text>
            <Text style={styles.testnetSubtitle}>
              Do not send real tokens here — they will not be visible. Switch to a Real account for mainnet.
            </Text>
          </View>
        </View>
      )}

      {/* Pending Split Banner */}
      {pendingSplitsCount > 0 && firstSplitId && (
        <TouchableOpacity
          style={styles.pendingBanner}
          onPress={() => router.push(`/split/${firstSplitId}`)}
        >
          <FontAwesome name="exclamation-circle" size={16} color="#FFA500" />
          <Text style={styles.pendingBannerText}>
            {pendingSplitsCount} pending payment request{pendingSplitsCount > 1 ? 's' : ''}
          </Text>
          <FontAwesome name="chevron-right" size={12} color={theme.colors.textTertiary} />
        </TouchableOpacity>
      )}

      {/* Scheduled Payments Banner */}
      {scheduledPendingCount > 0 && (
        <TouchableOpacity
          style={styles.scheduledBanner}
          onPress={() => router.push('/scheduled')}
        >
          <FontAwesome name="calendar" size={16} color={theme.colors.accent} />
          <Text style={styles.scheduledBannerText}>
            {scheduledPendingCount} scheduled payment{scheduledPendingCount > 1 ? 's' : ''} pending
          </Text>
          <FontAwesome name="chevron-right" size={12} color={theme.colors.textTertiary} />
        </TouchableOpacity>
      )}

      {/* Tokens Found on Other Networks */}
      {visibleAlerts.length > 0 && (
        <View style={styles.scanningSection}>
          {visibleAlerts.length === 1 || showAllScanningAlerts ? (
            visibleAlerts.map((alert) => (
              <TokenFoundNotification
                key={`${alert.networkId}-${alert.tokenSymbol}`}
                balance={alert}
                onBridge={onBridgeToken}
                onDismiss={onDismissAlert}
                onSnooze={onSnoozeAlert}
              />
            ))
          ) : (
            <TokenFoundBadge
              count={visibleAlerts.length}
              totalUsdValue={scanningTotalUsdValue}
              onPress={onShowAllScanningAlerts}
            />
          )}
        </View>
      )}

      {/* AI Suggestions */}
      {aiSuggestions.length > 0 && (
        <View style={styles.aiSuggestionsSection}>
          <SuggestionBannerList
            suggestions={aiSuggestions}
            onDismiss={onDismissSuggestion}
            maxVisible={2}
          />
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFA50015',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginTop: theme.spacing.md,
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: '#FFA50030',
  },
  pendingBannerText: {
    ...theme.typography.caption,
    color: '#FFA500',
    flex: 1,
  },
  scheduledBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.accent + '15',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginTop: theme.spacing.md,
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.accent + '30',
  },
  scheduledBannerText: {
    ...theme.typography.caption,
    color: theme.colors.accent,
    flex: 1,
  },
  scanningSection: {
    marginTop: theme.spacing.md,
  },
  aiSuggestionsSection: {
    marginTop: theme.spacing.md,
  },
  testnetBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginTop: theme.spacing.md,
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
  },
  testnetBannerText: {
    flex: 1,
  },
  testnetTitle: {
    ...theme.typography.caption,
    color: '#fbbf24',
    fontWeight: '600',
  },
  testnetSubtitle: {
    ...theme.typography.caption,
    color: 'rgba(251, 191, 36, 0.7)',
    fontSize: 11,
    marginTop: 2,
  },
});
