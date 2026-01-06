/**
 * Fee Preview Component
 * 
 * Shows fee estimate with warnings and cap checks:
 * - Current fee estimate
 * - Fee level indicator
 * - Warning/error messages
 * - Cap exceeded alerts
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { BigNumber } from 'ethers';
import { suggestFees, calculateTotalFee } from '../../../wallet/fees';
import { checkFeeCap, generateFeeWarning } from '../feeCaps';
import type { Network } from '../../../config/env';
import type { FeeCapCheck, FeeWarning } from '../feeCaps';

// ============================================================================
// Types
// ============================================================================

interface Props {
  network: Network;
  gasLimit: BigNumber;
  feeLevel?: 'low' | 'medium' | 'high';
  ethPriceUSD?: number;
  onFeeCheck?: (check: FeeCapCheck) => void;
  locale?: string;
}

// ============================================================================
// Component
// ============================================================================

export function FeePreview({
  network,
  gasLimit,
  feeLevel = 'medium',
  ethPriceUSD,
  onFeeCheck,
  locale = 'en',
}: Props) {
  const [loading, setLoading] = useState(true);
  const [feeETH, setFeeETH] = useState<string>('');
  const [feeUSD, setFeeUSD] = useState<string | undefined>();
  const [check, setCheck] = useState<FeeCapCheck | null>(null);
  const [warning, setWarning] = useState<FeeWarning | null>(null);

  useEffect(() => {
    loadFeeEstimate();
  }, [network, gasLimit.toString(), feeLevel, ethPriceUSD]);

  const loadFeeEstimate = async () => {
    setLoading(true);
    
    try {
      // Get fee suggestion
      const suggestion = await suggestFees(network, gasLimit, ethPriceUSD);
      const level = suggestion[feeLevel];
      
      // Calculate total fee
      const { totalFeeETH, totalFeeUSD } = calculateTotalFee(
        gasLimit,
        level.maxFeePerGas,
        ethPriceUSD
      );
      
      setFeeETH(totalFeeETH);
      setFeeUSD(totalFeeUSD);
      
      // Check fee cap
      const feeWei = gasLimit.mul(level.maxFeePerGas);
      const feeCheck = await checkFeeCap(feeWei, ethPriceUSD);
      setCheck(feeCheck);
      
      // Generate warning
      const feeWarning = generateFeeWarning(feeCheck, locale);
      setWarning(feeWarning);
      
      // Notify parent
      if (onFeeCheck) {
        onFeeCheck(feeCheck);
      }
    } catch (error) {
      console.error('Failed to load fee estimate:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color="#007AFF" />
        <Text style={styles.loadingText}>Estimating fee...</Text>
      </View>
    );
  }

  if (!check || !warning) {
    return null;
  }

  const levelColor = getLevelColor(warning.level);
  const levelIcon = getLevelIcon(warning.level);

  return (
    <View style={styles.container}>
      {/* Fee Amount */}
      <View style={styles.feeRow}>
        <Text style={styles.feeLabel}>Transaction Fee:</Text>
        <View style={styles.feeValue}>
          <Text style={styles.feeETH}>{feeETH} ETH</Text>
          {feeUSD && (
            <Text style={styles.feeUSD}>${feeUSD}</Text>
          )}
        </View>
      </View>

      {/* Warning/Error Box */}
      <View style={[styles.warningBox, { backgroundColor: levelColor.bg }]}>
        <View style={styles.warningHeader}>
          <Text style={styles.warningIcon}>{levelIcon}</Text>
          <Text style={[styles.warningTitle, { color: levelColor.text }]}>
            {warning.title}
          </Text>
        </View>
        <Text style={[styles.warningMessage, { color: levelColor.text }]}>
          {warning.message}
        </Text>
      </View>

      {/* Cap Info */}
      {check.capETH && (
        <View style={styles.capInfo}>
          <Text style={styles.capLabel}>Fee Cap:</Text>
          <Text style={styles.capValue}>
            {check.capETH} ETH
            {check.capUSD && ` ($${check.capUSD})`}
          </Text>
        </View>
      )}

      {/* Approval Required */}
      {check.requiresApproval && (
        <View style={styles.approvalBox}>
          <Text style={styles.approvalIcon}>🔐</Text>
          <Text style={styles.approvalText}>
            Biometric approval required before execution
          </Text>
        </View>
      )}

      {/* Refresh Button */}
      <TouchableOpacity
        style={styles.refreshButton}
        onPress={loadFeeEstimate}
      >
        <Text style={styles.refreshText}>🔄 Refresh Fee</Text>
      </TouchableOpacity>
    </View>
  );
}

// ============================================================================
// Batch Fee Preview (for Split Bills)
// ============================================================================

interface BatchFeePreviewProps {
  network: Network;
  gasLimit: BigNumber;
  txCount: number;
  feeLevel?: 'low' | 'medium' | 'high';
  ethPriceUSD?: number;
  locale?: string;
}

export function BatchFeePreview({
  network,
  gasLimit,
  txCount,
  feeLevel = 'medium',
  ethPriceUSD,
  locale = 'en',
}: BatchFeePreviewProps) {
  const [loading, setLoading] = useState(true);
  const [perTxFeeETH, setPerTxFeeETH] = useState<string>('');
  const [totalFeeETH, setTotalFeeETH] = useState<string>('');
  const [totalFeeUSD, setTotalFeeUSD] = useState<string | undefined>();

  useEffect(() => {
    loadBatchFeeEstimate();
  }, [network, gasLimit.toString(), txCount, feeLevel, ethPriceUSD]);

  const loadBatchFeeEstimate = async () => {
    setLoading(true);
    
    try {
      const suggestion = await suggestFees(network, gasLimit, ethPriceUSD);
      const level = suggestion[feeLevel];
      
      // Per-tx fee
      const { totalFeeETH: perTx, totalFeeUSD: perTxUSD } = calculateTotalFee(
        gasLimit,
        level.maxFeePerGas,
        ethPriceUSD
      );
      
      setPerTxFeeETH(perTx);
      
      // Total fee
      const totalFeeWei = gasLimit.mul(level.maxFeePerGas).mul(txCount);
      const { totalFeeETH: total, totalFeeUSD: totalUSD } = calculateTotalFee(
        BigNumber.from(txCount),
        gasLimit.mul(level.maxFeePerGas),
        ethPriceUSD
      );
      
      setTotalFeeETH(total);
      setTotalFeeUSD(totalUSD);
    } catch (error) {
      console.error('Failed to load batch fee estimate:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color="#007AFF" />
        <Text style={styles.loadingText}>Estimating fees...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.batchHeader}>
        <Text style={styles.batchTitle}>Batch Fee Estimate</Text>
        <Text style={styles.batchCount}>{txCount} transactions</Text>
      </View>

      <View style={styles.feeRow}>
        <Text style={styles.feeLabel}>Per Transaction:</Text>
        <Text style={styles.feeValue}>{perTxFeeETH} ETH</Text>
      </View>

      <View style={styles.feeRow}>
        <Text style={styles.feeLabel}>Total Fee:</Text>
        <View style={styles.feeValue}>
          <Text style={styles.feeTotalETH}>{totalFeeETH} ETH</Text>
          {totalFeeUSD && (
            <Text style={styles.feeUSD}>${totalFeeUSD}</Text>
          )}
        </View>
      </View>

      <TouchableOpacity
        style={styles.refreshButton}
        onPress={loadBatchFeeEstimate}
      >
        <Text style={styles.refreshText}>🔄 Refresh Fees</Text>
      </TouchableOpacity>
    </View>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function getLevelColor(level: 'info' | 'warning' | 'error') {
  switch (level) {
    case 'info':
      return { bg: '#E3F2FF', text: '#007AFF' };
    case 'warning':
      return { bg: '#FFF3CD', text: '#856404' };
    case 'error':
      return { bg: '#F8D7DA', text: '#721C24' };
  }
}

function getLevelIcon(level: 'info' | 'warning' | 'error'): string {
  switch (level) {
    case 'info':
      return 'ℹ️';
    case 'warning':
      return '⚠️';
    case 'error':
      return '⛔';
  }
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    marginBottom: 16,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  feeLabel: {
    fontSize: 14,
    color: '#8E8E93',
  },
  feeValue: {
    alignItems: 'flex-end',
  },
  feeETH: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
  },
  feeTotalETH: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
  },
  feeUSD: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  warningBox: {
    padding: 12,
    borderRadius: 6,
    marginBottom: 12,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  warningIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  warningTitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  warningMessage: {
    fontSize: 12,
    lineHeight: 18,
  },
  capInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    marginBottom: 12,
  },
  capLabel: {
    fontSize: 12,
    color: '#8E8E93',
  },
  capValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000000',
  },
  approvalBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#E3F2FF',
    borderRadius: 6,
    marginBottom: 12,
  },
  approvalIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  approvalText: {
    flex: 1,
    fontSize: 12,
    color: '#007AFF',
  },
  refreshButton: {
    padding: 8,
    alignItems: 'center',
  },
  refreshText: {
    fontSize: 12,
    color: '#007AFF',
  },
  batchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  batchTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#000000',
  },
  batchCount: {
    fontSize: 12,
    color: '#8E8E93',
  },
});
