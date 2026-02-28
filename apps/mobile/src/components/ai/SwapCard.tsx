/**
 * SwapCard Component
 * Displays token swap confirmation in AI chat
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome } from '@expo/vector-icons';
import { theme } from '@/src/constants/theme';
import { getAiChatTheme } from '@/src/constants/ai-chat-theme';
import { useTheme } from '@/src/contexts';
import { truncateAddress } from '@/src/utils/format';
import { TestModeWarning } from '@/src/components/TestModeWarning';
import { getCardStyles } from './card-styles';
import { LogoStrokeDraw } from './LogoStrokeDraw';

export interface PendingSwap {
  id: string;
  fromToken: {
    symbol: string;
    amount: string;
    amountUsd: string;
    logoURI?: string;
  };
  toToken: {
    symbol: string;
    amount: string;
    amountUsd: string;
    logoURI?: string;
  };
  rate: string; // e.g., "1 ETH = 2500 USDC"
  priceImpact: string; // e.g., "0.05%"
  estimatedGas: string;
  estimatedGasUsd: string;
  slippage: string; // e.g., "0.5%"
  network: string;
  requiresApproval: boolean;
  status: 'pending_confirmation';
}

interface SwapCardProps {
  swap: PendingSwap;
  onApprove?: () => Promise<void>;
  onConfirm: (swap: PendingSwap) => Promise<string>; // Returns txHash
  onCancel: () => void;
  onComplete: () => void;
  isTestAccount?: boolean;
}

export function SwapCard({
  swap,
  onApprove,
  onConfirm,
  onCancel,
  onComplete,
  isTestAccount = false,
}: SwapCardProps) {
  const { isDark } = useTheme();
  const aiChatTheme = useMemo(() => getAiChatTheme(isDark), [isDark]);
  const cs = useMemo(() => getCardStyles(aiChatTheme), [aiChatTheme]);

  const [status, setStatus] = useState<'idle' | 'approving' | 'confirming' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [isApproved, setIsApproved] = useState(!swap.requiresApproval);

  const handleApprove = async () => {
    if (!onApprove) return;

    setStatus('approving');
    setError(null);

    try {
      await onApprove();
      setIsApproved(true);
      setStatus('idle');
    } catch (err) {
      setError((err as Error).message || 'Approval failed');
      setStatus('error');
    }
  };

  const handleConfirm = async () => {
    setStatus('confirming');
    setError(null);

    try {
      const hash = await onConfirm(swap);
      setTxHash(hash);
      setStatus('success');
    } catch (err) {
      setError((err as Error).message || 'Swap failed');
      setStatus('error');
    }
  };

  // Success state
  if (status === 'success') {
    return (
      <View style={cs.container}>
        <View style={cs.successContainer}>
          <LinearGradient
            colors={['#10B981', '#059669']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={cs.successCard}
          >
            <FontAwesome name="check-circle" size={32} color="#FFFFFF" />
            <Text style={cs.successTitle}>Swap Complete!</Text>
            <Text style={cs.successSubtitle}>
              {swap.fromToken.amount} {swap.fromToken.symbol} → {swap.toToken.amount} {swap.toToken.symbol}
            </Text>
            {txHash && (
              <Text style={cs.txHash}>{truncateAddress(txHash)}</Text>
            )}
          </LinearGradient>

          <TouchableOpacity style={cs.doneButton} onPress={onComplete}>
            <Text style={cs.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={cs.container}>
      <View style={cs.card}>
        <LogoStrokeDraw />
        {/* Header */}
        <View style={cs.header}>
          <View style={[cs.headerIcon, { backgroundColor: 'rgba(245,158,11,0.15)' }]}>
            <FontAwesome name="exchange" size={16} color="#F59E0B" />
          </View>
          <Text style={cs.headerTitle}>Confirm Swap</Text>
        </View>

        {/* Swap Display */}
        <View style={[styles.swapSection, { borderBottomColor: aiChatTheme.divider }]}>
          {/* From Token */}
          <View style={[styles.tokenBox, {
            backgroundColor: aiChatTheme.surfaceTint,
            borderColor: aiChatTheme.borderTint,
          }]}>
            <Text style={[styles.tokenLabel, { color: aiChatTheme.text.tertiary }]}>From</Text>
            <View style={styles.tokenRow}>
              <View style={styles.tokenIcon}>
                <Text style={[styles.tokenIconText, { color: aiChatTheme.text.primary }]}>
                  {swap.fromToken.symbol.slice(0, 2)}
                </Text>
              </View>
              <View style={styles.tokenInfo}>
                <Text style={[styles.tokenAmount, { color: aiChatTheme.text.primary }]}>
                  {swap.fromToken.amount} {swap.fromToken.symbol}
                </Text>
                <Text style={[styles.tokenUsd, { color: aiChatTheme.text.secondary }]}>~${swap.fromToken.amountUsd}</Text>
              </View>
            </View>
          </View>

          {/* Arrow */}
          <View style={styles.arrowContainer}>
            <FontAwesome name="arrow-down" size={20} color={aiChatTheme.text.tertiary} />
          </View>

          {/* To Token */}
          <View style={[styles.tokenBox, {
            backgroundColor: aiChatTheme.surfaceTint,
            borderColor: aiChatTheme.borderTint,
          }]}>
            <Text style={[styles.tokenLabel, { color: aiChatTheme.text.tertiary }]}>To</Text>
            <View style={styles.tokenRow}>
              <View style={[styles.tokenIcon, styles.tokenIconGreen]}>
                <Text style={[styles.tokenIconText, { color: aiChatTheme.text.primary }]}>
                  {swap.toToken.symbol.slice(0, 2)}
                </Text>
              </View>
              <View style={styles.tokenInfo}>
                <Text style={[styles.tokenAmount, { color: aiChatTheme.text.primary }]}>
                  {swap.toToken.amount} {swap.toToken.symbol}
                </Text>
                <Text style={[styles.tokenUsd, { color: aiChatTheme.text.secondary }]}>~${swap.toToken.amountUsd}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Details */}
        <View style={cs.details}>
          <View style={cs.detailRow}>
            <Text style={cs.detailLabel}>Rate</Text>
            <Text style={cs.detailValue}>{swap.rate}</Text>
          </View>
          <View style={cs.detailRow}>
            <Text style={cs.detailLabel}>Price Impact</Text>
            <Text style={[
              cs.detailValue,
              parseFloat(swap.priceImpact) > 1 && { color: aiChatTheme.accentAmber }
            ]}>
              {swap.priceImpact}
            </Text>
          </View>
          <View style={cs.detailRow}>
            <Text style={cs.detailLabel}>Slippage</Text>
            <Text style={cs.detailValue}>{swap.slippage}</Text>
          </View>
          <View style={cs.detailRow}>
            <Text style={cs.detailLabel}>Network</Text>
            <Text style={cs.detailValue}>{swap.network}</Text>
          </View>
          <View style={cs.detailRow}>
            <Text style={cs.detailLabel}>Gas Fee</Text>
            <Text style={cs.detailValue}>
              ~{swap.estimatedGas} ETH (${swap.estimatedGasUsd})
            </Text>
          </View>
        </View>

        {/* Approval Required Banner */}
        {!isApproved && (
          <View style={styles.approvalBanner}>
            <FontAwesome name="unlock-alt" size={14} color="#F59E0B" />
            <Text style={styles.approvalText}>
              Token approval required before swap
            </Text>
          </View>
        )}

        {/* Error */}
        {error && (
          <View style={cs.errorBanner}>
            <FontAwesome name="exclamation-circle" size={14} color={aiChatTheme.accentRed} />
            <Text style={cs.errorText}>{error}</Text>
          </View>
        )}

        {/* Test Account Warning */}
        {isTestAccount && (
          <View style={{ marginHorizontal: theme.spacing.md, marginBottom: theme.spacing.md }}>
            <TestModeWarning />
          </View>
        )}

        {/* Actions */}
        <View style={cs.actions}>
          <TouchableOpacity
            style={cs.cancelButton}
            onPress={onCancel}
            disabled={status === 'approving' || status === 'confirming'}
          >
            <Text style={cs.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          {!isApproved ? (
            <TouchableOpacity
              style={[cs.confirmButton, status === 'approving' && cs.confirmButtonDisabled]}
              onPress={handleApprove}
              disabled={status === 'approving'}
            >
              <LinearGradient
                colors={['#F59E0B', '#D97706']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={cs.confirmButtonGradient}
              >
                {status === 'approving' ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <FontAwesome name="unlock-alt" size={14} color="#FFFFFF" />
                    <Text style={cs.confirmButtonText}>Approve</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[cs.confirmButton, status === 'confirming' && cs.confirmButtonDisabled]}
              onPress={handleConfirm}
              disabled={status === 'confirming'}
            >
              <LinearGradient
                colors={['#F59E0B', '#D97706']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={cs.confirmButtonGradient}
              >
                {status === 'confirming' ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <FontAwesome name="exchange" size={14} color="#FFFFFF" />
                    <Text style={cs.confirmButtonText}>Swap</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  swapSection: {
    padding: theme.spacing.md,
    borderBottomWidth: 1,
  },
  tokenBox: {
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
  },
  tokenLabel: {
    ...theme.typography.caption,
    marginBottom: theme.spacing.sm,
  },
  tokenRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tokenIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(51,136,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  tokenIconGreen: {
    backgroundColor: 'rgba(16,185,129,0.2)',
  },
  tokenIconText: {
    ...theme.typography.body,
    fontWeight: '600',
  },
  tokenInfo: {
    flex: 1,
  },
  tokenAmount: {
    ...theme.typography.body,
    fontWeight: '600',
  },
  tokenUsd: {
    ...theme.typography.caption,
    marginTop: 2,
  },
  arrowContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  approvalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.sm,
    backgroundColor: 'rgba(245,158,11,0.1)',
    borderRadius: theme.borderRadius.sm,
  },
  approvalText: {
    ...theme.typography.caption,
    color: '#F59E0B',
    flex: 1,
  },
});
