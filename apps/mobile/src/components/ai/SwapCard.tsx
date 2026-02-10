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
import { truncateAddress } from '@/src/utils/format';
import { TestModeWarning } from '@/src/components/TestModeWarning';
import { cardStyles } from './card-styles';

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

  // Success state
  if (status === 'success') {
    return (
      <View style={cardStyles.container}>
        <View style={cardStyles.successContainer}>
          <LinearGradient
            colors={['#10B981', '#059669']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={cardStyles.successCard}
          >
            <FontAwesome name="check-circle" size={32} color="#FFFFFF" />
            <Text style={cardStyles.successTitle}>Swap Complete!</Text>
            <Text style={cardStyles.successSubtitle}>
              {swap.fromToken.amount} {swap.fromToken.symbol} → {swap.toToken.amount} {swap.toToken.symbol}
            </Text>
            {txHash && (
              <Text style={cardStyles.txHash}>{truncateAddress(txHash)}</Text>
            )}
          </LinearGradient>

          <TouchableOpacity style={cardStyles.doneButton} onPress={onComplete}>
            <Text style={cardStyles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={cardStyles.container}>
      <View style={cardStyles.card}>
        {/* Header */}
        <View style={cardStyles.header}>
          <View style={[cardStyles.headerIcon, { backgroundColor: 'rgba(245,158,11,0.15)' }]}>
            <FontAwesome name="exchange" size={16} color="#F59E0B" />
          </View>
          <Text style={cardStyles.headerTitle}>Confirm Swap</Text>
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
        <View style={cardStyles.details}>
          <View style={cardStyles.detailRow}>
            <Text style={cardStyles.detailLabel}>Rate</Text>
            <Text style={cardStyles.detailValue}>{swap.rate}</Text>
          </View>
          <View style={cardStyles.detailRow}>
            <Text style={cardStyles.detailLabel}>Price Impact</Text>
            <Text style={[
              cardStyles.detailValue,
              parseFloat(swap.priceImpact) > 1 && styles.detailValueWarning
            ]}>
              {swap.priceImpact}
            </Text>
          </View>
          <View style={cardStyles.detailRow}>
            <Text style={cardStyles.detailLabel}>Slippage</Text>
            <Text style={cardStyles.detailValue}>{swap.slippage}</Text>
          </View>
          <View style={cardStyles.detailRow}>
            <Text style={cardStyles.detailLabel}>Network</Text>
            <Text style={cardStyles.detailValue}>{swap.network}</Text>
          </View>
          <View style={cardStyles.detailRow}>
            <Text style={cardStyles.detailLabel}>Gas Fee</Text>
            <Text style={cardStyles.detailValue}>
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
          <View style={cardStyles.errorBanner}>
            <FontAwesome name="exclamation-circle" size={14} color={aiChat.accentRed} />
            <Text style={cardStyles.errorText}>{error}</Text>
          </View>
        )}

        {/* Test Account Warning */}
        {isTestAccount && (
          <View style={{ marginHorizontal: theme.spacing.md, marginBottom: theme.spacing.md }}>
            <TestModeWarning />
          </View>
        )}

        {/* Actions */}
        <View style={cardStyles.actions}>
          <TouchableOpacity
            style={cardStyles.cancelButton}
            onPress={onCancel}
            disabled={status === 'approving' || status === 'confirming'}
          >
            <Text style={cardStyles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          {!isApproved ? (
            <TouchableOpacity
              style={[cardStyles.confirmButton, status === 'approving' && cardStyles.confirmButtonDisabled]}
              onPress={handleApprove}
              disabled={status === 'approving'}
            >
              <LinearGradient
                colors={['#F59E0B', '#D97706']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={cardStyles.confirmButtonGradient}
              >
                {status === 'approving' ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <FontAwesome name="unlock-alt" size={14} color="#FFFFFF" />
                    <Text style={cardStyles.confirmButtonText}>Approve</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[cardStyles.confirmButton, status === 'confirming' && cardStyles.confirmButtonDisabled]}
              onPress={handleConfirm}
              disabled={status === 'confirming'}
            >
              <LinearGradient
                colors={['#F59E0B', '#D97706']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={cardStyles.confirmButtonGradient}
              >
                {status === 'confirming' ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <FontAwesome name="exchange" size={14} color="#FFFFFF" />
                    <Text style={cardStyles.confirmButtonText}>Swap</Text>
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
});
