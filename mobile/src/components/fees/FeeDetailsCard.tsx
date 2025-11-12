/**
 * Fee Details Card
 * 
 * Shows transparent fee breakdown
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import Card from '../common/Card';
import type { FeeEstimate } from '../../wallet/fees';
import { formatGwei } from '../../wallet/fees';

interface Props {
  estimate: FeeEstimate;
  showUSD?: boolean;
}

export default function FeeDetailsCard({ estimate, showUSD = true }: Props) {
  const { theme } = useTheme();

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="speedometer-outline" size={20} color={theme.colors.primary} />
        <Text style={[styles.title, { color: theme.colors.text }]}>Fee Breakdown</Text>
      </View>

      <View style={styles.content}>
        {/* Base Fee */}
        <View style={styles.row}>
          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
            Base Fee:
          </Text>
          <Text style={[styles.value, { color: theme.colors.text }]}>
            {formatGwei(estimate.baseFee).slice(0, 8)} Gwei
          </Text>
        </View>

        {/* Priority Fee */}
        <View style={styles.row}>
          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
            Priority Fee (Tip):
          </Text>
          <Text style={[styles.value, { color: theme.colors.text }]}>
            {formatGwei(estimate.priorityFee).slice(0, 8)} Gwei
          </Text>
        </View>

        {/* Max Fee Per Gas */}
        <View style={styles.row}>
          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
            Max Fee Per Gas:
          </Text>
          <Text style={[styles.value, { color: theme.colors.text }]}>
            {formatGwei(estimate.maxFeePerGas).slice(0, 8)} Gwei
          </Text>
        </View>

        {/* Gas Limit */}
        <View style={styles.row}>
          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
            Gas Limit:
          </Text>
          <Text style={[styles.value, { color: theme.colors.text }]}>
            {estimate.gasLimit.toString()}
          </Text>
        </View>

        <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

        {/* Total Fee ETH */}
        <View style={styles.row}>
          <Text style={[styles.totalLabel, { color: theme.colors.text }]}>
            Total Fee:
          </Text>
          <Text style={[styles.totalValue, { color: theme.colors.primary }]}>
            {estimate.totalFeeETH.slice(0, 10)} ETH
          </Text>
        </View>

        {/* Total Fee USD */}
        {showUSD && estimate.totalFeeUSD && (
          <View style={styles.row}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
              ≈ ${estimate.totalFeeUSD} USD
            </Text>
          </View>
        )}
      </View>

      <View style={[styles.infoBox, { backgroundColor: theme.colors.surface }]}>
        <Ionicons name="information-circle-outline" size={16} color={theme.colors.primary} />
        <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
          You'll pay the actual base fee + priority fee. Max fee is the limit.
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
});
