/**
 * AmountDisplay Component
 * Shows amount with token symbol and optional USD value
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '@/src/constants/theme';

interface Props {
  amount: string;
  tokenSymbol: string;
  usdValue?: number;
  placeholder?: string;
}

export function AmountDisplay({ amount, tokenSymbol, usdValue, placeholder = '0' }: Props) {
  return (
    <View style={styles.container}>
      <Text
        style={[styles.amount, theme.typography.displayLarge]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.5}
      >
        {amount || placeholder}
      </Text>
      <Text style={[styles.token, theme.typography.heading, { color: theme.colors.textSecondary }]}>
        {tokenSymbol}
      </Text>
      {usdValue !== undefined && amount && (
        <Text style={[styles.usd, theme.typography.body, { color: theme.colors.textSecondary }]}>
          ${usdValue.toFixed(2)} USD
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
  },
  amount: {
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  token: {
    marginBottom: theme.spacing.xs,
  },
  usd: {},
});
