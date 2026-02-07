/**
 * SwapCard Component
 * Displays token swap confirmation in AI chat
 */

import React, { useState } from 'react';
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
import { aiChat } from '@/src/constants/ai-chat-theme';
import { TestModeWarning } from '@/src/components/TestModeWarning';

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

  const formatAddress = (address: string) => {
    if (address.length <= 12) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Success state
  if (status === 'success') {
    return (
      <View style={styles.container}>
        <View style={styles.successContainer}>
          <LinearGradient
            colors={['#10B981', '#059669']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.successCard}
          >
            <FontAwesome name="check-circle" size={32} color="#FFFFFF" />
            <Text style={styles.successTitle}>Swap Complete!</Text>
            <Text style={styles.successSubtitle}>
              {swap.fromToken.amount} {swap.fromToken.symbol} → {swap.toToken.amount} {swap.toToken.symbol}
            </Text>
            {txHash && (
              <Text style={styles.txHash}>{formatAddress(txHash)}</Text>
            )}
          </LinearGradient>

          <TouchableOpacity style={styles.doneButton} onPress={onComplete}>
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <FontAwesome name="exchange" size={16} color="#F59E0B" />
          </View>
          <Text style={styles.headerTitle}>Confirm Swap</Text>
        </View>

        {/* Swap Display */}
        <View style={styles.swapSection}>
          {/* From Token */}
          <View style={styles.tokenBox}>
            <Text style={styles.tokenLabel}>From</Text>
            <View style={styles.tokenRow}>
              <View style={styles.tokenIcon}>
                <Text style={styles.tokenIconText}>
                  {swap.fromToken.symbol.slice(0, 2)}
                </Text>
              </View>
              <View style={styles.tokenInfo}>
                <Text style={styles.tokenAmount}>
                  {swap.fromToken.amount} {swap.fromToken.symbol}
                </Text>
                <Text style={styles.tokenUsd}>~${swap.fromToken.amountUsd}</Text>
              </View>
            </View>
          </View>

          {/* Arrow */}
          <View style={styles.arrowContainer}>
            <FontAwesome name="arrow-down" size={20} color={aiChat.text.tertiary} />
          </View>

          {/* To Token */}
          <View style={styles.tokenBox}>
            <Text style={styles.tokenLabel}>To</Text>
            <View style={styles.tokenRow}>
              <View style={[styles.tokenIcon, styles.tokenIconGreen]}>
                <Text style={styles.tokenIconText}>
                  {swap.toToken.symbol.slice(0, 2)}
                </Text>
              </View>
              <View style={styles.tokenInfo}>
                <Text style={styles.tokenAmount}>
                  {swap.toToken.amount} {swap.toToken.symbol}
                </Text>
                <Text style={styles.tokenUsd}>~${swap.toToken.amountUsd}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Details */}
        <View style={styles.details}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Rate</Text>
            <Text style={styles.detailValue}>{swap.rate}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Price Impact</Text>
            <Text style={[
              styles.detailValue,
              parseFloat(swap.priceImpact) > 1 && styles.detailValueWarning
            ]}>
              {swap.priceImpact}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Slippage</Text>
            <Text style={styles.detailValue}>{swap.slippage}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Network</Text>
            <Text style={styles.detailValue}>{swap.network}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Gas Fee</Text>
            <Text style={styles.detailValue}>
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
          <View style={styles.errorBanner}>
            <FontAwesome name="exclamation-circle" size={14} color={aiChat.accentRed} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Test Account Warning */}
        {isTestAccount && (
          <View style={{ marginHorizontal: theme.spacing.md, marginBottom: theme.spacing.md }}>
            <TestModeWarning />
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onCancel}
            disabled={status === 'approving' || status === 'confirming'}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          {!isApproved ? (
            <TouchableOpacity
              style={[styles.confirmButton, status === 'approving' && styles.confirmButtonDisabled]}
              onPress={handleApprove}
              disabled={status === 'approving'}
            >
              <LinearGradient
                colors={['#F59E0B', '#D97706']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.confirmButtonGradient}
              >
                {status === 'approving' ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <FontAwesome name="unlock-alt" size={14} color="#FFFFFF" />
                    <Text style={styles.confirmButtonText}>Approve</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.confirmButton, status === 'confirming' && styles.confirmButtonDisabled]}
              onPress={handleConfirm}
              disabled={status === 'confirming'}
            >
              <LinearGradient
                colors={['#F59E0B', '#D97706']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.confirmButtonGradient}
              >
                {status === 'confirming' ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <FontAwesome name="exchange" size={14} color="#FFFFFF" />
                    <Text style={styles.confirmButtonText}>Swap</Text>
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
  container: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  card: {
    backgroundColor: aiChat.glassCard.bg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(51,136,255,0.2)',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: aiChat.divider,
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(245,158,11,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
  },
  headerTitle: {
    ...theme.typography.body,
    color: aiChat.text.primary,
    fontWeight: '600',
  },
  swapSection: {
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: aiChat.divider,
  },
  tokenBox: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  tokenLabel: {
    ...theme.typography.caption,
    color: aiChat.text.tertiary,
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
    color: aiChat.text.primary,
    fontWeight: '600',
  },
  tokenInfo: {
    flex: 1,
  },
  tokenAmount: {
    ...theme.typography.body,
    color: aiChat.text.primary,
    fontWeight: '600',
  },
  tokenUsd: {
    ...theme.typography.caption,
    color: aiChat.text.secondary,
    marginTop: 2,
  },
  arrowContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  details: {
    padding: theme.spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  detailLabel: {
    ...theme.typography.caption,
    color: aiChat.text.tertiary,
  },
  detailValue: {
    ...theme.typography.body,
    color: aiChat.text.primary,
    fontWeight: '500',
  },
  detailValueWarning: {
    color: aiChat.accentAmber,
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
    color: aiChat.accentAmber,
    flex: 1,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.sm,
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: theme.borderRadius.sm,
  },
  errorText: {
    ...theme.typography.caption,
    color: aiChat.accentRed,
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: aiChat.divider,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    ...theme.typography.body,
    color: aiChat.text.secondary,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 2,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
  },
  confirmButtonDisabled: {
    opacity: 0.6,
  },
  confirmButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
  },
  confirmButtonText: {
    ...theme.typography.body,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  // Success state styles
  successContainer: {
    gap: theme.spacing.md,
  },
  successCard: {
    alignItems: 'center',
    padding: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
  },
  successTitle: {
    ...theme.typography.heading,
    color: '#FFFFFF',
    fontWeight: '700',
    marginTop: theme.spacing.md,
  },
  successSubtitle: {
    ...theme.typography.body,
    color: 'rgba(255,255,255,0.8)',
    marginTop: theme.spacing.xs,
  },
  txHash: {
    ...theme.typography.caption,
    color: 'rgba(255,255,255,0.6)',
    marginTop: theme.spacing.sm,
  },
  doneButton: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  doneButtonText: {
    ...theme.typography.body,
    color: aiChat.text.primary,
    fontWeight: '600',
  },
});
